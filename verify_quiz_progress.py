
import requests
import sys

# Base URL
BASE_URL = "http://localhost:8000/api"

# 1. Login to get token
def login():
    print("Logging in...")
    # Use the test user if exists, or register
    email = "test_progress@example.com"
    password = "password123"
    
    # Try login
    resp = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    if resp.status_code == 200:
        return resp.json()["access_token"]
        
    # Register if login fails
    print("Registering new user...")
    requests.post(f"{BASE_URL}/auth/register", json={
        "email": email,
        "password": password,
        "name": "Progress Test User",
        "grade": 10
    })
    resp = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    if resp.status_code == 200:
        return resp.json()["access_token"]
    
    print("Login failed")
    sys.exit(1)

def verify_progress():
    token = login()
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Generate Quiz
    print("Generating quiz...")
    resp = requests.post(f"{BASE_URL}/quizzes/generate", json={"topic": "Math", "num_questions": 3}, headers=headers)
    if resp.status_code != 201:
        print(f"Generation failed: {resp.text}")
        sys.exit(1)
        
    quiz_id = resp.json()["id"]
    print(f"Quiz generated: {quiz_id}")
    
    # 3. Update Progress (Answer Q1)
    print("Updating progress (Answer Q1)...")
    answers = [1] # Answer for first question
    resp = requests.put(f"{BASE_URL}/quizzes/{quiz_id}/progress", json={"answers": answers}, headers=headers)
    if resp.status_code != 200:
        print(f"Update failed: {resp.text}")
        sys.exit(1)
        
    # 4. Verify Update Persisted
    print("Verifying persistence...")
    resp = requests.get(f"{BASE_URL}/quizzes/{quiz_id}", headers=headers)
    data = resp.json()
    saved_answers = data["answers"]
    print(f"Saved answers: {saved_answers}")
    
    if len(saved_answers) == 1 and saved_answers[0] == 1:
        print("SUCCESS: Progress saved correctly!")
    else:
        print("FAILURE: Progress not saved correctly.")
        sys.exit(1)

if __name__ == "__main__":
    verify_progress()
