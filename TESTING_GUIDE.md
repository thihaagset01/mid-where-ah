# MidWhereAh Testing Guide

## Table of Contents
1. [Authentication](#authentication)
2. [Home Page](#home-page)
3. [Profile Page](#profile-page)
4. [Groups](#groups)
5. [Group Chat](#group-chat)
6. [Friends](#friends)
7. [View Map](#view-map)
8. [Error Handling](#error-handling)

## Authentication

### Login Page (`/login`)
1. **Successful Login**
   - Enter valid email and 
   works
   - Verify redirect to `/app`
   works
   - Check session is created
   works
2. **Failed Login**
   - Enter invalid credentials
   yes
   - Verify error message appears
   yes but need to change to more user-centric, rn is dev centered
   - Check no session is created
   yes

3. **Session Persistence**
   - Login and refresh page
   yes
   - Verify still logged in
   yes
   - Check session cookie settings
   how

## Home Page (`/app`)

### Map Functionality
1. **Initial Load**
   - Map loads centered on user location
   no just singapore
   - Current location marker appears
   no but dont need
   - Zoom controls are functional
   yes

2. **Location Inputs**
   - Add a new location
   yes
   - Verify marker appears on map
   yes, only if autocomplete is CLICKED by user but it should also check if user manually types in address
   - Remove a location
   yes but only if it was an added location, not for if location 1 and location 2 are backspaced by user
   - Check marker is removed
   no
   - Find Central functionality kind of working

   
3. **Navigation**
   - Click on navigation items
   yes
   - Verify correct page loads
   yes
   - Check active state updates
   yes

## Profile Page (`/mobile/profile`)

### View Profile
1. **Profile Information**
   - Verify display name shows
   yes
   - Check email is displayed
   yes
   - Profile picture loads
   only placeholder

2. **Edit Profile**  - yes to all
   - Click edit button
   - Update display name
   - Save changes
   - Verify updates persist after refresh

## Groups (`/mobile/groups`)

### Group List
1. **View Groups**
   - Verify existing groups load
   yes
   - Check group names and member counts
   yes
   - Click on group to view details
   yes but loading screen is not working smoothly
   
   THERE'S NO BACK BUTTON TO EXIT BACK TO GROUPS (covered by css of header i think)

2. **Create Group**
   - Click "Create Group"
   yes
   - Enter group name
    yes
   - Verify group appears in list
   yes
   - Check creator is set as admin
   not a feature

3. **Join Group**
   - Click "Join Group"
   yes
   - Enter valid invite code
   yes
   - Verify group appears in list
   yes
   - Check member count updates
   yes

## Group Chat (`/mobile/group_chat`)

### Messaging
1. **Send Message**
   - Type a message
   yes
   - Press send
   yes
   - Verify message appears in chat
   yes
   - Check timestamp is correct
   yes

2. **Message History**
   - Refresh page
   yes
   - Verify previous messages load
   yes
   - Check message order is correct
   yes

## Friends (`/friends`)

### Friend Management
1. **Send Request**
   - Search for a user
   yes
   - Send friend request
   yes
   - Verify pending request appears
   yes
this overall works but not smoothly at all, there is an error popup but the functionality is actually working, but not smoothly at all/is confusing for user


2. **Accept Request**
   - From another account, accept request   
   yes
   - Verify friend appears in list
   no friends yet on all accounts
   - Check mutual friends count updates
   i dont know

3. **Remove Friend**
   - Click remove on a friend
   not working because no friends yet
   - Confirm removal
   - Verify friend is removed from list
   not working because no friends yet

## View Map (`/view_map`)

### Map View - NOTHING WORKING
1. **Event Details**
   - Verify event details load
   - Check location marker is correct
   - Verify date/time displays properly

2. **Navigation**
   - Click "Get Directions"
   - Verify maps app opens with route
   - Check back button returns to app

## Error Handling

### 404 Page
1. Navigate to non-existent route
   - Verify custom 404 page 
   no
   - Check navigation back to home works
   yes

