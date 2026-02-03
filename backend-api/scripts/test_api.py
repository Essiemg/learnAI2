"""
Test API Endpoints
==================
Tests the main API endpoints to verify everything is working.
"""
import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_endpoint(name, method, url, data=None, headers=None, expected_status=None):
    """Test an API endpoint."""
    print(f"\n{'='*60}")
    print(f"Testing: {name}")
    print(f"{'='*60}")
    print(f"{method} {url}")
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        elif method == "POST":
            response = requests.post(url, json=data, headers=headers, timeout=10)
        elif method == "PUT":
            response = requests.put(url, json=data, headers=headers, timeout=10)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers, timeout=10)
        else:
            print(f"Unknown method: {method}")
            return None
        
        status_icon = "✓" if (expected_status is None or response.status_code == expected_status) else "✗"
        print(f"{status_icon} Status: {response.status_code}")
        
        try:
            result = response.json()
            print(f"Response: {json.dumps(result, indent=2)[:500]}")
            return result
        except:
            print(f"Response: {response.text[:500]}")
            return response.text
            
    except requests.exceptions.ConnectionError:
        print("✗ Connection Error - Server might not be running")
        return None
    except Exception as e:
        print(f"✗ Error: {e}")
        return None


def main():
    print("\n" + "=" * 60)
    print("LearnAI API Endpoint Tests")
    print("=" * 60)
    
    # 1. Health Check
    test_endpoint(
        "Health Check",
        "GET",
        f"{BASE_URL}/health"
    )
    
    # 2. Register a test user
    test_user = {
        "name": "Test User",
        "email": f"test{__import__('random').randint(1000,9999)}@example.com",
        "password": "testpass123",
        "grade": 7
    }
    
    result = test_endpoint(
        "Register User",
        "POST",
        f"{BASE_URL}/auth/register",
        data=test_user
    )
    
    token = None
    if result and "access_token" in result:
        token = result["access_token"]
        print(f"\n✓ Got token: {token[:30]}...")
    
    # 3. Login with the test user
    login_result = test_endpoint(
        "Login",
        "POST",
        f"{BASE_URL}/auth/login",
        data={"email": test_user["email"], "password": test_user["password"]}
    )
    
    if login_result and "access_token" in login_result:
        token = login_result["access_token"]
    
    # Auth header
    auth_headers = {"Authorization": f"Bearer {token}"} if token else {}
    
    # 4. Get user profile
    test_endpoint(
        "Get Profile",
        "GET",
        f"{BASE_URL}/auth/me",
        headers=auth_headers
    )
    
    # 5. Test tutor endpoint (with ML model)
    test_endpoint(
        "Tutor Request (ML Strategy)",
        "POST",
        f"{BASE_URL}/tutor",
        data={
            "subject": "math",
            "question": "What is 2 + 2?",
            "mistakes": 2,
            "time_spent": 120,
            "frustration": 3,
            "recent_accuracy": 0.7
        },
        headers=auth_headers
    )
    
    # 6. Test tutor with high frustration (should return encouragement)
    test_endpoint(
        "Tutor Request (High Frustration)",
        "POST",
        f"{BASE_URL}/tutor",
        data={
            "subject": "physics",
            "question": "I don't understand Newton's laws",
            "mistakes": 5,
            "time_spent": 300,
            "frustration": 9,
            "recent_accuracy": 0.2
        },
        headers=auth_headers
    )
    
    # 7. Create a goal
    test_endpoint(
        "Create Goal",
        "POST",
        f"{BASE_URL}/goals",
        data={
            "title": "Learn Algebra",
            "description": "Complete all algebra chapters"
        },
        headers=auth_headers
    )
    
    # 8. List goals
    test_endpoint(
        "List Goals",
        "GET",
        f"{BASE_URL}/goals",
        headers=auth_headers
    )
    
    # 9. Get progress/interactions
    test_endpoint(
        "Get Interactions",
        "GET",
        f"{BASE_URL}/progress/interactions",
        headers=auth_headers
    )
    
    # 10. Test Google OAuth URL (should redirect)
    test_endpoint(
        "Google OAuth URL",
        "GET",
        f"{BASE_URL}/auth/google",
        expected_status=307  # Redirect or 501 if not configured
    )
    
    print("\n" + "=" * 60)
    print("API Tests Complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
