
import sys
import os
import asyncio
from datetime import datetime

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend-api"))

from db import SessionLocal
from models import User
from routers.report_routes import generate_progress_report

async def debug_report():
    print("Debugging Report Generation...")
    db = SessionLocal()
    
    # Get the user created in verify_analytics (or any user)
    user = db.query(User).filter(User.email.like("%test_analytics%")).first()
    if not user:
        # Fallback to first user
        user = db.query(User).first()
        
    if not user:
        print("No user found to test report generation.")
        return

    print(f"Testing for User: {user.email} (ID: {user.id})")
    
    try:
        report = await generate_progress_report(current_user=user, db=db)
        print("[OK] Report Generated Successfully!")

        print(f"Total Quizzes: {report.total_quizzes}")
        print(f"AI Feedback: {report.ai_feedback}")
    except Exception as e:
        print(f"[FAIL] Report Generation Failed: {e}")
        import traceback

        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(debug_report())
