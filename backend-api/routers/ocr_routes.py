"""
OCR Routes - Text extraction from images using Tesseract OCR
Includes image preprocessing for better accuracy with handwritten/printed work
"""
import os
import io
import base64
import logging
from typing import Optional, Literal
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from db import get_db
from auth import get_current_user
from models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ocr", tags=["OCR"])


# ============== PYDANTIC MODELS ==============
class OCRRequest(BaseModel):
    """Request for OCR text extraction."""
    image_base64: str = Field(..., description="Base64 encoded image data (with or without data URL prefix)")
    preprocessing: Optional[Literal["none", "standard", "handwriting"]] = Field(
        "standard",
        description="Preprocessing mode: 'none' (raw), 'standard' (for printed text), 'handwriting' (optimized for handwritten text)"
    )
    language: Optional[str] = Field("eng", description="OCR language code (default: eng)")


class OCRResponse(BaseModel):
    """Response with extracted text."""
    text: str
    confidence: Optional[float] = None
    word_count: int
    preprocessing_applied: str


# ============== IMAGE PREPROCESSING ==============
def decode_base64_image(image_base64: str):
    """Decode base64 image to PIL Image."""
    try:
        from PIL import Image
        
        # Remove data URL prefix if present (e.g., "data:image/png;base64,")
        if "," in image_base64:
            image_base64 = image_base64.split(",", 1)[1]
        
        # Decode base64
        image_bytes = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if necessary (handle PNG with alpha, etc.)
        if image.mode in ("RGBA", "LA", "P"):
            # Create white background
            background = Image.new("RGB", image.size, (255, 255, 255))
            if image.mode == "P":
                image = image.convert("RGBA")
            background.paste(image, mask=image.split()[-1] if image.mode == "RGBA" else None)
            image = background
        elif image.mode != "RGB":
            image = image.convert("RGB")
        
        return image
    except Exception as e:
        logger.error(f"Failed to decode base64 image: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")


def preprocess_image_standard(image):
    """
    Standard preprocessing for printed text.
    
    Steps:
    1. Convert to grayscale
    2. Apply Gaussian blur for noise reduction
    3. Apply adaptive thresholding for better contrast
    4. Deskew if needed
    """
    import cv2
    import numpy as np
    from PIL import Image
    
    # Convert PIL to OpenCV format
    img_array = np.array(image)
    
    # Convert to grayscale
    if len(img_array.shape) == 3:
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    else:
        gray = img_array
    
    # Apply Gaussian blur to reduce noise
    blurred = cv2.GaussianBlur(gray, (3, 3), 0)
    
    # Apply adaptive thresholding
    # This works well for text on varying backgrounds
    thresh = cv2.adaptiveThreshold(
        blurred,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        11,  # Block size
        2    # C constant
    )
    
    # Optional: Apply morphological operations to clean up
    kernel = np.ones((1, 1), np.uint8)
    cleaned = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    
    # Convert back to PIL Image
    return Image.fromarray(cleaned)


def preprocess_image_handwriting(image):
    """
    Optimized preprocessing for handwritten text.
    
    Handwritten text often has:
    - Varying stroke widths
    - Connected letters
    - Uneven baselines
    
    Steps:
    1. Convert to grayscale
    2. Apply bilateral filter (preserves edges while smoothing)
    3. Apply OTSU thresholding
    4. Dilate slightly to connect broken strokes
    """
    import cv2
    import numpy as np
    from PIL import Image
    
    # Convert PIL to OpenCV format
    img_array = np.array(image)
    
    # Convert to grayscale
    if len(img_array.shape) == 3:
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    else:
        gray = img_array
    
    # Bilateral filter - smooths while keeping edges sharp
    # Good for handwriting as it preserves stroke edges
    filtered = cv2.bilateralFilter(gray, 9, 75, 75)
    
    # Apply OTSU thresholding (automatically finds optimal threshold)
    _, thresh = cv2.threshold(filtered, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Invert if background is darker than text
    if np.mean(thresh) < 127:
        thresh = cv2.bitwise_not(thresh)
    
    # Slight dilation to connect broken strokes in handwriting
    kernel = np.ones((2, 2), np.uint8)
    dilated = cv2.dilate(thresh, kernel, iterations=1)
    
    # Clean up small noise
    kernel_clean = np.ones((2, 2), np.uint8)
    cleaned = cv2.morphologyEx(dilated, cv2.MORPH_OPEN, kernel_clean)
    
    # Convert back to PIL Image
    return Image.fromarray(cleaned)


def enhance_image_for_ocr(image, preprocessing: str = "standard"):
    """Apply preprocessing based on mode."""
    if preprocessing == "none":
        return image, "none"
    elif preprocessing == "handwriting":
        return preprocess_image_handwriting(image), "handwriting"
    else:  # standard
        return preprocess_image_standard(image), "standard"


# ============== OCR FUNCTIONS ==============
def extract_text_with_tesseract(image, language: str = "eng") -> tuple[str, float]:
    """
    Extract text from image using Tesseract OCR.
    
    Returns:
        tuple: (extracted_text, confidence_score)
    """
    try:
        import pytesseract
        
        # Configure Tesseract for better results
        custom_config = r'--oem 3 --psm 6'
        # OEM 3 = Default, based on what is available
        # PSM 6 = Assume a single uniform block of text
        
        # Get detailed data including confidence
        data = pytesseract.image_to_data(
            image,
            lang=language,
            config=custom_config,
            output_type=pytesseract.Output.DICT
        )
        
        # Extract text and calculate average confidence
        texts = []
        confidences = []
        
        for i, text in enumerate(data['text']):
            if text.strip():
                texts.append(text)
                conf = data['conf'][i]
                if conf != -1:  # -1 means not available
                    confidences.append(conf)
        
        extracted_text = ' '.join(texts)
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        
        return extracted_text, avg_confidence / 100.0  # Normalize to 0-1
        
    except ImportError:
        logger.error("pytesseract not installed")
        raise HTTPException(
            status_code=500,
            detail="OCR service not available. Please install Tesseract OCR."
        )
    except Exception as e:
        logger.error(f"Tesseract OCR error: {e}")
        # Try simple extraction as fallback
        try:
            import pytesseract
            text = pytesseract.image_to_string(image, lang=language)
            return text.strip(), 0.0
        except:
            raise HTTPException(status_code=500, detail=f"OCR extraction failed: {str(e)}")


# ============== API ENDPOINTS ==============
@router.post("/extract", response_model=OCRResponse)
async def extract_text_from_image(
    request: OCRRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Extract text from an image using Tesseract OCR.
    
    Supports both handwritten and printed text with specialized preprocessing.
    
    **Request body:**
    - image_base64: Base64 encoded image (JPEG, PNG, etc.)
    - preprocessing: "none", "standard" (default), or "handwriting"
    - language: Tesseract language code (default: "eng")
    
    **Returns:**
    - text: Extracted text
    - confidence: OCR confidence score (0.0-1.0)
    - word_count: Number of words extracted
    - preprocessing_applied: Which preprocessing was used
    """
    # Decode image
    image = decode_base64_image(request.image_base64)
    
    # Apply preprocessing
    processed_image, preprocessing_used = enhance_image_for_ocr(
        image, 
        request.preprocessing or "standard"
    )
    
    # Extract text with Tesseract
    extracted_text, confidence = extract_text_with_tesseract(
        processed_image,
        request.language or "eng"
    )
    
    # Clean up extracted text
    extracted_text = ' '.join(extracted_text.split())  # Normalize whitespace
    word_count = len(extracted_text.split()) if extracted_text else 0
    
    logger.info(f"OCR extracted {word_count} words with {confidence:.2%} confidence")
    
    return OCRResponse(
        text=extracted_text,
        confidence=confidence,
        word_count=word_count,
        preprocessing_applied=preprocessing_used
    )


@router.post("/extract-file")
async def extract_text_from_file(
    file: UploadFile = File(...),
    preprocessing: str = Form("standard"),
    language: str = Form("eng"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Extract text from an uploaded image file.
    
    Alternative to base64 endpoint - accepts direct file upload.
    
    **Form data:**
    - file: Image file (JPEG, PNG, etc.)
    - preprocessing: "none", "standard", or "handwriting"
    - language: Tesseract language code
    """
    from PIL import Image
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        # Read file content
        content = await file.read()
        image = Image.open(io.BytesIO(content))
        
        # Convert to RGB if needed
        if image.mode in ("RGBA", "LA", "P"):
            background = Image.new("RGB", image.size, (255, 255, 255))
            if image.mode == "P":
                image = image.convert("RGBA")
            background.paste(image, mask=image.split()[-1] if image.mode == "RGBA" else None)
            image = background
        elif image.mode != "RGB":
            image = image.convert("RGB")
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read image: {str(e)}")
    
    # Apply preprocessing
    processed_image, preprocessing_used = enhance_image_for_ocr(image, preprocessing)
    
    # Extract text
    extracted_text, confidence = extract_text_with_tesseract(processed_image, language)
    
    # Clean up
    extracted_text = ' '.join(extracted_text.split())
    word_count = len(extracted_text.split()) if extracted_text else 0
    
    return OCRResponse(
        text=extracted_text,
        confidence=confidence,
        word_count=word_count,
        preprocessing_applied=preprocessing_used
    )
