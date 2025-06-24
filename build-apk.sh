#!/bin/bash

# Copy google-services.json to the correct location
echo "Copying google-services.json to app directory..."
cp google-services.json android/app/google-services.json

# Copy and rename keystore file
echo "Copying and renaming keystore file..."
cp @nkosib__exam-quiz.jks android/app/keystore.jks

#copy build.gradle to android directory
echo "Copying build.gradle to android directory..."
cp build.gradle android/app/build.gradle

# Navigate to android directory and run build commands
cd android
./gradlew clean
./gradlew assembleDebug

echo "Build completed!"
echo "APK location: android/app/build/outputs/apk/debug/app-debug.apk"