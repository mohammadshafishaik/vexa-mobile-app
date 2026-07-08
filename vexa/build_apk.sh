#!/bin/bash
set -e

cd /Users/shaikshafi/Documents/software\ project/vexa
rm -rf android/.gradle
rm -rf android/app/build
rm -rf android/app/.cxx
rm -rf node_modules
npm cache clean --force
npm install

sed -i '' 's/build\/intermediates\/cmake\/${BUILD_TYPE}\/obj\/${ANDROID_ABI}\/libworklets.so/build\/intermediates\/cxx\/RelWithDebInfo\/1u36y243\/obj\/${ANDROID_ABI}\/libworklets.so/' node_modules/react-native-reanimated/android/CMakeLists.txt

cd android
./gradlew clean
./gradlew assembleRelease
