# MidWhereAh Firestore Database Schema

This document outlines the Firestore database schema for the MidWhereAh application.

## Collections

### users
Stores user profile information.

```
users/{userId}
{
  name: string,
  email: string,
  photoURL: string (optional),
  createdAt: timestamp,
  lastLogin: timestamp,
  preferences: {
    defaultTransportMode: string (walking, driving, transit),
    notificationsEnabled: boolean
  }
}
```

### groups
Stores information about meetup groups.

```
groups/{groupId}
{
  name: string,
  description: string,
  admin: string (userId),
  createdAt: timestamp,
  updatedAt: timestamp,
  members: {
    [userId]: {
      name: string,
      email: string,
      photoURL: string (optional),
      joinedAt: timestamp,
      role: string (admin, member)
    }
  },
  inviteCode: string,
  status: string (active, planning, completed),
  meetupDate: timestamp (optional),
  selectedVenue: {
    id: string,
    name: string,
    address: string,
    placeId: string
  } (optional)
}
```

### groups/{groupId}/locations
Subcollection storing location information for each group member.

```
groups/{groupId}/locations/{userId}
{
  userId: string,
  address: string,
  latitude: number,
  longitude: number,
  placeId: string,
  updatedAt: timestamp,
  transportMode: string (walking, driving, transit)
}
```

### groups/{groupId}/venues
Subcollection storing venue recommendations for the group.

```
groups/{groupId}/venues/{venueId}
{
  name: string,
  address: string,
  latitude: number,
  longitude: number,
  placeId: string,
  types: array<string>,
  rating: number,
  userRatingsTotal: number,
  priceLevel: number,
  photos: array<string>,
  website: string,
  phoneNumber: string,
  openingHours: array<string>,
  distance: {
    [userId]: number  // Distance in meters for each user
  },
  travelTime: {
    [userId]: number  // Travel time in seconds for each user
  },
  fairnessScore: number,  // Lower is better
  addedAt: timestamp
}
```

### groups/{groupId}/votes
Subcollection storing votes from each group member.

```
groups/{groupId}/votes/{userId}
{
  userId: string,
  userName: string,
  votes: {
    [venueId]: string (yes, no, maybe)
  },
  updatedAt: timestamp
}
```

### groups/{groupId}/messages
Subcollection storing chat messages for the group.

```
groups/{groupId}/messages/{messageId}
{
  userId: string,
  userName: string,
  userPhotoURL: string (optional),
  text: string,
  timestamp: timestamp,
  type: string (text, system, venue)
  venueRef: string (optional, reference to venue if message is about a venue)
}
```

## Indexes

The following composite indexes will be needed:

1. `groups` collection:
   - Fields: `members.[userId]`, `createdAt` (descending)
   - Purpose: Query for groups a user belongs to, sorted by creation date

2. `groups/{groupId}/venues` subcollection:
   - Fields: `fairnessScore` (ascending), `rating` (descending)
   - Purpose: Sort venues by fairness and then by rating

3. `groups/{groupId}/messages` subcollection:
   - Fields: `timestamp` (ascending)
   - Purpose: Display messages in chronological order

## Security Rules

Security rules are defined in `firestore.rules` and enforce the following principles:

1. Users can only read and write their own user documents
2. Group members can read group data
3. Only group admins can update group data
4. Group members can add/update their own locations
5. Only group admins can add venues
6. Group members can only vote for themselves
7. Group members can send messages to groups they belong to
