import sys
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_dependencies():
    print("Checking ML dependencies...")
    try:
        import numpy as np
        print(f"NumPy version: {np.__version__}")
        
        import pandas as pd
        print(f"Pandas version: {pd.__version__}")
        
        import torch
        print(f"PyTorch version: {torch.__version__}")
        
        import sklearn
        print(f"Scikit-learn version: {sklearn.__version__}")
        
        import joblib
        print(f"Joblib version: {joblib.__version__}")
        
        # Test loading ml_models (which imports these)
        print("Importing ml_models...")
        # Add parent dir to path if needed, assuming run from backend-api
        sys.path.append(os.getcwd())
        try:
            import ml_models
            print("Successfully imported ml_models")
        except ImportError as e:
            print(f"Failed to import ml_models: {e}")
            sys.exit(1)
        except Exception as e:
            print(f"Error during import: {e}")
            sys.exit(1)
            
        print("All dependencies checked successfully.")
    except Exception as e:
        print(f"Dependency check failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    check_dependencies()
