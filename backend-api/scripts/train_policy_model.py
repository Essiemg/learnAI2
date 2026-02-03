"""
Train Policy Model for Teaching Strategy Selection
===================================================
This script trains a simple RandomForest classifier to predict the best
teaching strategy based on student state.

Features:
- grade: Student's grade level (1-12)
- mistakes: Number of mistakes in current session
- time_spent: Time spent on current problem (seconds)
- frustration: Frustration level (0-10)
- recent_accuracy: Recent accuracy score (0.0-1.0)

Target Strategies:
0: scaffolding      - Break down into smaller steps
1: socratic         - Ask guiding questions
2: direct_instruction - Explain concept clearly
3: encouragement    - Provide emotional support
4: practice         - More practice problems
5: visual           - Use diagrams/visualizations
6: analogies        - Use real-world analogies
7: review           - Review prerequisites
"""
import os
import sys
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib

# Create models directory if it doesn't exist
os.makedirs("../models", exist_ok=True)

# Strategy mapping
STRATEGIES = [
    "scaffolding",
    "socratic",
    "direct_instruction",
    "encouragement",
    "practice",
    "visual",
    "analogies",
    "review"
]

def generate_training_data(n_samples=5000):
    """
    Generate synthetic training data based on pedagogical heuristics.
    
    In a real application, this would come from actual tutoring sessions
    where expert tutors labeled the best strategy for each situation.
    """
    np.random.seed(42)
    
    X = []
    y = []
    
    for _ in range(n_samples):
        # Random student state
        grade = np.random.randint(1, 13)
        mistakes = np.random.randint(0, 10)
        time_spent = np.random.randint(0, 600)  # 0-10 minutes
        frustration = np.random.randint(0, 11)
        recent_accuracy = np.random.uniform(0, 1)
        
        # Determine best strategy based on heuristics
        if frustration >= 8:
            # High frustration -> encouragement
            strategy = 3  # encouragement
        elif frustration >= 6 and recent_accuracy < 0.4:
            # Moderate frustration + low accuracy -> scaffolding
            strategy = 0  # scaffolding
        elif recent_accuracy < 0.3:
            # Very low accuracy -> review prerequisites
            strategy = 7  # review
        elif mistakes >= 5:
            # Many mistakes -> break down the problem
            strategy = 0  # scaffolding
        elif time_spent > 300 and mistakes > 2:
            # Stuck for a while with some mistakes -> direct instruction
            strategy = 2  # direct_instruction
        elif grade <= 3:
            # Young students -> visual aids
            strategy = 5  # visual
        elif grade >= 9 and recent_accuracy > 0.7:
            # Older students doing well -> socratic method
            strategy = 1  # socratic
        elif recent_accuracy > 0.8:
            # Doing well -> more practice
            strategy = 4  # practice
        elif time_spent < 30 and mistakes == 0:
            # Quick and correct -> use analogies to extend learning
            strategy = 6  # analogies
        else:
            # Default to socratic method
            strategy = 1  # socratic
        
        # Add some noise to make it more realistic
        if np.random.random() < 0.1:
            strategy = np.random.randint(0, 8)
        
        X.append([grade, mistakes, time_spent, frustration, recent_accuracy])
        y.append(strategy)
    
    return np.array(X), np.array(y)


def train_model():
    """Train and save the policy model."""
    print("=" * 60)
    print("Training Policy Model for Teaching Strategy Selection")
    print("=" * 60)
    
    # Generate training data
    print("\n1. Generating synthetic training data...")
    X, y = generate_training_data(n_samples=10000)
    print(f"   Generated {len(X)} samples")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    print(f"   Training set: {len(X_train)} samples")
    print(f"   Test set: {len(X_test)} samples")
    
    # Train model
    print("\n2. Training RandomForest classifier...")
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        min_samples_split=5,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)
    print("   Training complete!")
    
    # Evaluate
    print("\n3. Evaluating model...")
    y_pred = model.predict(X_test)
    accuracy = (y_pred == y_test).mean()
    print(f"   Accuracy: {accuracy:.2%}")
    
    print("\n   Classification Report:")
    print(classification_report(
        y_test, y_pred, 
        target_names=STRATEGIES,
        zero_division=0
    ))
    
    # Feature importance
    print("\n4. Feature Importance:")
    features = ["grade", "mistakes", "time_spent", "frustration", "recent_accuracy"]
    importances = model.feature_importances_
    for feat, imp in sorted(zip(features, importances), key=lambda x: -x[1]):
        print(f"   {feat}: {imp:.3f}")
    
    # Save model
    model_path = "../models/policy_model.joblib"
    print(f"\n5. Saving model to {model_path}...")
    joblib.dump(model, model_path)
    print("   Model saved successfully!")
    
    # Test prediction
    print("\n6. Test Predictions:")
    test_cases = [
        [5, 0, 60, 2, 0.85, "Good student, suggest practice"],
        [7, 5, 300, 8, 0.3, "Frustrated student, needs encouragement"],
        [3, 2, 120, 4, 0.5, "Young student, use visuals"],
        [10, 1, 45, 1, 0.9, "Advanced student, use socratic"],
        [6, 6, 400, 6, 0.2, "Struggling, needs scaffolding"],
    ]
    
    for case in test_cases:
        features = case[:5]
        description = case[5]
        pred_idx = model.predict([features])[0]
        pred_strategy = STRATEGIES[pred_idx]
        print(f"   {description}")
        print(f"   -> Predicted: {pred_strategy}\n")
    
    print("=" * 60)
    print("Training Complete!")
    print("=" * 60)
    
    return model


if __name__ == "__main__":
    train_model()
