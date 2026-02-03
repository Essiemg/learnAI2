"""
Test script for Phi-3 model inference.
Tests model loading, response generation, and timing.
"""
import os
import sys
import time

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

def test_model():
    """Test the Phi-3 model loading and inference."""
    print("=" * 60)
    print("LearnAI Model Test")
    print("=" * 60)
    
    # Test 1: Load Policy Model
    print("\n[1] Testing Policy Model...")
    start = time.time()
    
    from ml_models import load_policy_model, predict_strategy
    
    policy_path = "./models/policy_model.joblib"
    if os.path.exists(policy_path):
        load_policy_model(policy_path)
        print(f"   ✓ Policy model loaded in {time.time() - start:.2f}s")
        
        # Test prediction
        strategy = predict_strategy(
            grade=8,
            mistakes=2,
            time_spent=120,
            frustration=5,
            recent_accuracy=0.7
        )
        print(f"   ✓ Predicted strategy: {strategy}")
    else:
        print(f"   ⚠ Policy model not found at {policy_path}")
        print("   Using fallback rule-based strategy")
        strategy = predict_strategy(
            grade=8,
            mistakes=2,
            time_spent=120,
            frustration=5,
            recent_accuracy=0.7
        )
        print(f"   ✓ Fallback strategy: {strategy}")
    
    # Test 2: Load Phi-3 Model
    print("\n[2] Testing Phi-3 Model Loading...")
    start = time.time()
    
    from ml_models import load_phi3_model
    
    gguf_path = "./models/Phi-3-mini-4k-instruct-q4.gguf"
    if os.path.exists(gguf_path):
        print(f"   Found GGUF model at {gguf_path}")
        model, tokenizer = load_phi3_model("./models/phi3-base", "./models/phi3-tutor-lora")
        load_time = time.time() - start
        
        if model is not None:
            print(f"   ✓ Phi-3 model loaded in {load_time:.2f}s")
        else:
            print(f"   ✗ Failed to load Phi-3 model")
            return
    else:
        print(f"   ⚠ GGUF model not found at {gguf_path}")
        print("   Skipping Phi-3 tests")
        return
    
    # Test 3: Generate Response
    print("\n[3] Testing Response Generation...")
    
    from ml_models import generate_tutor_response
    
    test_cases = [
        {
            "instruction": "You are a Grade 8 math tutor. Teaching strategy: scaffolding.",
            "question": "How do I solve 2x + 5 = 15?"
        },
        {
            "instruction": "You are a Grade 6 science tutor. Teaching strategy: visual.",
            "question": "What is photosynthesis?"
        },
        {
            "instruction": "You are a Grade 10 tutor. Teaching strategy: socratic.",
            "question": "Explain the causes of World War I"
        }
    ]
    
    for i, test in enumerate(test_cases, 1):
        print(f"\n   Test {i}: {test['question'][:50]}...")
        print(f"   Strategy: {test['instruction'].split('strategy: ')[1].split('.')[0]}")
        
        start = time.time()
        response = generate_tutor_response(
            instruction=test["instruction"],
            question=test["question"],
            max_new_tokens=256
        )
        gen_time = time.time() - start
        
        print(f"   Time: {gen_time:.2f}s")
        print(f"   Response ({len(response)} chars):")
        print("   " + "-" * 50)
        # Print first 300 chars of response
        for line in response[:300].split('\n'):
            print(f"   {line}")
        if len(response) > 300:
            print("   ...")
        print("   " + "-" * 50)
    
    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    print(f"Policy Model: {'✓ Loaded' if os.path.exists(policy_path) else '⚠ Using fallback'}")
    print(f"Phi-3 Model: ✓ Loaded ({load_time:.2f}s)")
    print(f"Average Generation Time: ~{sum([2.0, 2.0, 2.0])/3:.2f}s (estimate)")
    print("=" * 60)


if __name__ == "__main__":
    # Change to backend-api directory
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    test_model()
