# Use Case Diagram

```mermaid
usecaseDiagram
  actor User
  actor Admin
  User -- (Register)
  User -- (Login)
  User -- (Start Chat)
  User -- (Send Message)
  User -- (Study Flashcards)
  User -- (Take Quiz)
  User -- (View Progress)
  User -- (Set Learning Goals)
  User -- (View Summaries)
  User -- (View Diagrams)
  Admin -- (Login)
  Admin -- (Manage Users)
  Admin -- (View Reports)
  Admin -- (Manage Content)
  Admin -- (Monitor System)
  (Register) ..> (Login) : include
  (Start Chat) ..> (Send Message) : include
  (Study Flashcards) ..> (View Progress) : include
  (Take Quiz) ..> (View Progress) : include
  (Set Learning Goals) ..> (View Progress) : include
```
