"""Authentication routes."""
import secrets
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import httpx
from urllib.parse import urlencode

from db import get_db
from models import User
from schemas import UserRegister, UserLogin, Token, UserProfile, GoogleAuthRequest
from auth import hash_password, verify_password, create_access_token, get_current_user
from config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


def generate_verification_token() -> str:
    """Generate a secure random verification token."""
    return secrets.token_urlsafe(32)


def send_verification_email(email: str, name: str, token: str) -> bool:
    """
    Send verification email to user.
    Returns True if email sent successfully, False otherwise.
    """
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        # SMTP not configured, log token for development
        logger.info(f"[DEV] Verification link for {email}: {settings.FRONTEND_URL}/verify-email?token={token}")
        return True
    
    try:
        # Create verification URL
        verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
        
        # Create email message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Verify your LearnAI account"
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL or settings.SMTP_USER}>"
        msg["To"] = email
        
        # Plain text version
        text_content = f"""
Hi {name},

Welcome to LearnAI! Please verify your email address by clicking the link below:

{verification_url}

This link will expire in {settings.VERIFICATION_TOKEN_EXPIRE_HOURS} hours.

If you didn't create an account, you can safely ignore this email.

Best regards,
The LearnAI Team
        """.strip()
        
        # HTML version
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .button {{ 
            display: inline-block; 
            padding: 12px 24px; 
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white; 
            text-decoration: none; 
            border-radius: 8px;
            font-weight: bold;
        }}
        .footer {{ margin-top: 30px; font-size: 12px; color: #666; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to LearnAI! 🎓</h1>
        <p>Hi {name},</p>
        <p>Thanks for signing up! Please verify your email address to get started.</p>
        <p style="text-align: center; margin: 30px 0;">
            <a href="{verification_url}" class="button">Verify Email</a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #6366f1;">{verification_url}</p>
        <p>This link will expire in {settings.VERIFICATION_TOKEN_EXPIRE_HOURS} hours.</p>
        <div class="footer">
            <p>If you didn't create an account, you can safely ignore this email.</p>
            <p>Best regards,<br>The LearnAI Team</p>
        </div>
    </div>
</body>
</html>
        """.strip()
        
        msg.attach(MIMEText(text_content, "plain"))
        msg.attach(MIMEText(html_content, "html"))
        
        # Send email
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, email, msg.as_string())
        
        logger.info(f"Verification email sent to {email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send verification email to {email}: {e}")
        return False


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """
    Register a new user.
    
    - **name**: User's display name
    - **email**: Unique email address
    - **password**: Password (min 8 characters, must include uppercase, lowercase, and number)
    - **grade**: Grade level (1-12)
    
    Sends verification email. User must verify before logging in.
    """
    try:
        # Check if email already exists
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Validate password requirements
        password = user_data.password
        if len(password) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 8 characters"
            )
        if not any(c.isupper() for c in password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must contain at least one uppercase letter"
            )
        if not any(c.islower() for c in password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must contain at least one lowercase letter"
            )
        if not any(c.isdigit() for c in password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must contain at least one number"
            )
        
        # Generate verification token
        verification_token = generate_verification_token()
        token_expires = datetime.utcnow() + timedelta(hours=settings.VERIFICATION_TOKEN_EXPIRE_HOURS)
        
        # Create new user (unverified)
        user = User(
            name=user_data.name,
            email=user_data.email,
            password_hash=hash_password(user_data.password),
            grade=user_data.grade,
            email_verified=False,
            verification_token=verification_token,
            verification_token_expires=token_expires
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Send verification email
        email_sent = send_verification_email(user.email, user.name, verification_token)
        
        return {
            "message": "Registration successful. Please check your email to verify your account.",
            "email_sent": email_sent
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticate user and return JWT token.
    
    - **email**: User's email address
    - **password**: User's password
    
    Returns JWT access token on success.
    User must have verified their email before logging in.
    """
    # Find user by email
    user = db.query(User).filter(User.email == credentials.email).first()
    
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if email is verified
    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in. Check your inbox for the verification link.",
        )
    
    # Generate token
    access_token = create_access_token(user.id)
    
    return Token(access_token=access_token)


@router.get("/verify-email")
async def verify_email(token: str, db: Session = Depends(get_db)):
    """
    Verify user's email address using the token from verification email.
    
    - **token**: Verification token from email link
    
    Returns success message and JWT token on successful verification.
    """
    # Find user by verification token
    user = db.query(User).filter(User.verification_token == token).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification token"
        )
    
    # Check if token has expired
    if user.verification_token_expires and datetime.utcnow() > user.verification_token_expires:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token has expired. Please request a new one."
        )
    
    # Check if already verified
    if user.email_verified:
        # Already verified, just return success with token
        access_token = create_access_token(user.id)
        return {
            "message": "Email already verified",
            "access_token": access_token,
            "token_type": "bearer"
        }
    
    # Mark email as verified
    user.email_verified = True
    user.verification_token = None
    user.verification_token_expires = None
    db.commit()
    
    # Generate access token so user can log in immediately
    access_token = create_access_token(user.id)
    
    return {
        "message": "Email verified successfully! You can now log in.",
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.post("/resend-verification")
async def resend_verification(email: str, db: Session = Depends(get_db)):
    """
    Resend verification email to user.
    
    - **email**: User's email address
    
    Always returns success to prevent email enumeration.
    """
    user = db.query(User).filter(User.email == email).first()
    
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If the email exists and is not verified, a new verification link has been sent."}
    
    # Check if already verified
    if user.email_verified:
        return {"message": "Email is already verified. You can log in."}
    
    # Generate new verification token
    verification_token = generate_verification_token()
    token_expires = datetime.utcnow() + timedelta(hours=settings.VERIFICATION_TOKEN_EXPIRE_HOURS)
    
    user.verification_token = verification_token
    user.verification_token_expires = token_expires
    db.commit()
    
    # Send verification email
    email_sent = send_verification_email(user.email, user.name, verification_token)
    
    return {
        "message": "If the email exists and is not verified, a new verification link has been sent.",
        "email_sent": email_sent
    }


@router.get("/me", response_model=UserProfile)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Get current user's profile.
    
    Requires Authorization header with Bearer token.
    """
    return UserProfile(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        grade=current_user.grade,
        created_at=current_user.created_at
    )


@router.put("/me", response_model=UserProfile)
async def update_me(
    name: str = None,
    grade: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's profile."""
    if name:
        current_user.name = name
    if grade and 1 <= grade <= 12:
        current_user.grade = grade
    
    db.commit()
    db.refresh(current_user)
    
    return UserProfile(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        grade=current_user.grade,
        created_at=current_user.created_at
    )


# In-memory reset token storage (in production, use Redis or database)
_reset_tokens: dict = {}


@router.post("/forgot-password")
async def forgot_password(email: str, db: Session = Depends(get_db)):
    """
    Request a password reset.
    
    In a real implementation, this would send an email.
    For now, it generates a token that can be used to reset the password.
    """
    import secrets
    from datetime import datetime, timedelta
    
    user = db.query(User).filter(User.email == email).first()
    
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If the email exists, a reset link has been sent"}
    
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=1)
    
    _reset_tokens[reset_token] = {
        "user_id": str(user.id),
        "email": email,
        "expires_at": expires_at.isoformat()
    }
    
    # In production, send email here
    # For development, just log the token
    import logging
    logging.info(f"Password reset token for {email}: {reset_token}")
    
    return {"message": "If the email exists, a reset link has been sent"}


@router.post("/reset-password")
async def reset_password(
    token: str,
    new_password: str,
    db: Session = Depends(get_db)
):
    """
    Reset password using a reset token.
    """
    from datetime import datetime
    
    if token not in _reset_tokens:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    token_data = _reset_tokens[token]
    expires_at = datetime.fromisoformat(token_data["expires_at"])
    
    if datetime.utcnow() > expires_at:
        del _reset_tokens[token]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired"
        )
    
    # Find and update user
    from uuid import UUID
    user = db.query(User).filter(User.id == UUID(token_data["user_id"])).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found"
        )
    
    user.password_hash = hash_password(new_password)
    db.commit()
    
    # Delete used token
    del _reset_tokens[token]
    
    return {"message": "Password has been reset successfully"}


@router.put("/update-password")
async def update_password(
    new_password: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update password for authenticated user.
    """
    if len(new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters"
        )
    
    current_user.password_hash = hash_password(new_password)
    db.commit()
    
    return {"message": "Password updated successfully"}


# -------------------------------------------------------------------------
# Google OAuth Endpoints
# -------------------------------------------------------------------------

@router.get("/google")
async def google_login():
    """
    Redirect to Google OAuth consent page.
    
    Frontend should redirect to this endpoint to start the OAuth flow.
    """
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth is not configured. Please set GOOGLE_CLIENT_ID."
        )
    
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "scope": "openid email profile",
        "response_type": "code",
        "access_type": "offline",
        "prompt": "select_account"
    }
    
    google_auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return RedirectResponse(url=google_auth_url)


@router.get("/google/callback")
async def google_callback(code: str, db: Session = Depends(get_db)):
    """
    Handle Google OAuth callback.
    
    This receives the authorization code from Google and exchanges it for tokens.
    """
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Google callback received with code: {code[:20]}...")
    
    try:
        # Exchange code for tokens
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code"
        }
        
        async with httpx.AsyncClient() as client:
            token_response = await client.post(token_url, data=token_data)
            
            if token_response.status_code != 200:
                logger.error(f"Token exchange failed: {token_response.text}")
                return RedirectResponse(
                    url=f"{settings.FRONTEND_URL}/login?error=google_auth_failed",
                    status_code=302
                )
            
            tokens = token_response.json()
            
            # Get user info from Google
            userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
            headers = {"Authorization": f"Bearer {tokens['access_token']}"}
            userinfo_response = await client.get(userinfo_url, headers=headers)
            
            if userinfo_response.status_code != 200:
                logger.error(f"User info fetch failed: {userinfo_response.text}")
                return RedirectResponse(
                    url=f"{settings.FRONTEND_URL}/login?error=google_userinfo_failed",
                    status_code=302
                )
            
            google_user = userinfo_response.json()
        
        # Find or create user
        email = google_user.get("email")
        name = google_user.get("name", email.split("@")[0])
        avatar_url = google_user.get("picture")
        
        logger.info(f"Google user info: email={email}, name={name}")
        
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            # Create new user (no password for OAuth users)
            # Google users are automatically verified since Google already verified their email
            import secrets
            logger.info(f"Creating new user for email: {email}")
            user = User(
                name=name,
                email=email,
                password_hash=hash_password(secrets.token_urlsafe(32)),  # Random password
                grade=7,  # Default grade
                avatar_url=avatar_url,
                email_verified=True  # Google verified the email
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            logger.info(f"New user created with id: {user.id}")
        else:
            # Update avatar if changed
            if avatar_url and user.avatar_url != avatar_url:
                user.avatar_url = avatar_url
            # Mark as verified if logging in with Google
            if not user.email_verified:
                user.email_verified = True
            db.commit()
            logger.info(f"Existing user found with id: {user.id}")
        
        # Generate JWT token
        access_token = create_access_token(user.id)
        logger.info(f"JWT token created for user: {user.id}")
        
        # Redirect to frontend with token
        redirect_url = f"{settings.FRONTEND_URL}/login?token={access_token}"
        logger.info(f"Redirecting to: {redirect_url[:50]}...")
        
        return RedirectResponse(url=redirect_url, status_code=302)
    
    except Exception as e:
        logger.error(f"Google OAuth callback error: {e}", exc_info=True)
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error=auth_failed",
            status_code=302
        )


@router.post("/google/token", response_model=Token)
async def google_auth_with_token(
    auth_data: GoogleAuthRequest,
    db: Session = Depends(get_db)
):
    """
    Authenticate with a Google ID token (for frontend popup flow).
    
    This is an alternative to the redirect flow - the frontend can use
    Google Sign-In library to get an ID token and send it here.
    """
    # Verify the ID token with Google
    async with httpx.AsyncClient() as client:
        # Use Google's tokeninfo endpoint to verify
        verify_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={auth_data.id_token}"
        response = await client.get(verify_url)
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Google ID token"
            )
        
        token_info = response.json()
    
    # Verify the token is for our app
    if token_info.get("aud") != settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token was not issued for this application"
        )
    
    email = token_info.get("email")
    name = token_info.get("name", email.split("@")[0])
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not provided by Google"
        )
    
    # Find or create user
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        import secrets
        user = User(
            name=name,
            email=email,
            password_hash=hash_password(secrets.token_urlsafe(32)),
            grade=7
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    # Generate JWT token
    access_token = create_access_token(user.id)
    
    return Token(access_token=access_token)
