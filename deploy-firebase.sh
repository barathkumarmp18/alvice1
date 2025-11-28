#!/bin/bash

# Alvice Firebase Deployment Script
# This script deploys Firestore rules, indexes, and storage rules to Firebase

echo "================================================"
echo "  Alvice Firebase Deployment Script"
echo "================================================"
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed."
    echo "📦 Installing Firebase CLI..."
    npm install -g firebase-tools
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install Firebase CLI. Please install manually:"
        echo "   npm install -g firebase-tools"
        exit 1
    fi
    echo "✅ Firebase CLI installed successfully"
fi

echo ""
echo "🔐 Logging into Firebase..."
firebase login

if [ $? -ne 0 ]; then
    echo "❌ Firebase login failed. Please try again."
    exit 1
fi

echo ""
echo "📋 Available deployment options:"
echo "  1. Deploy Firestore rules only"
echo "  2. Deploy Firestore indexes only"
echo "  3. Deploy Storage rules only"
echo "  4. Deploy all (rules + indexes + storage)"
echo "  5. Exit"
echo ""

read -p "Select an option (1-5): " option

case $option in
    1)
        echo ""
        echo "🚀 Deploying Firestore rules..."
        firebase deploy --only firestore:rules
        if [ $? -eq 0 ]; then
            echo "✅ Firestore rules deployed successfully!"
        else
            echo "❌ Failed to deploy Firestore rules"
            exit 1
        fi
        ;;
    2)
        echo ""
        echo "🚀 Deploying Firestore indexes..."
        firebase deploy --only firestore:indexes
        if [ $? -eq 0 ]; then
            echo "✅ Firestore indexes deployed successfully!"
            echo "⏳ Note: Index creation may take several minutes to complete."
        else
            echo "❌ Failed to deploy Firestore indexes"
            exit 1
        fi
        ;;
    3)
        echo ""
        echo "🚀 Deploying Storage rules..."
        firebase deploy --only storage
        if [ $? -eq 0 ]; then
            echo "✅ Storage rules deployed successfully!"
        else
            echo "❌ Failed to deploy Storage rules"
            exit 1
        fi
        ;;
    4)
        echo ""
        echo "🚀 Deploying all Firebase configurations..."
        
        echo "📝 Deploying Firestore rules..."
        firebase deploy --only firestore:rules
        if [ $? -ne 0 ]; then
            echo "❌ Failed to deploy Firestore rules"
            exit 1
        fi
        echo "✅ Firestore rules deployed!"
        
        echo ""
        echo "📊 Deploying Firestore indexes..."
        firebase deploy --only firestore:indexes
        if [ $? -ne 0 ]; then
            echo "❌ Failed to deploy Firestore indexes"
            exit 1
        fi
        echo "✅ Firestore indexes deployed!"
        
        echo ""
        echo "💾 Deploying Storage rules..."
        firebase deploy --only storage
        if [ $? -ne 0 ]; then
            echo "❌ Failed to deploy Storage rules"
            exit 1
        fi
        echo "✅ Storage rules deployed!"
        
        echo ""
        echo "================================================"
        echo "✅ All Firebase configurations deployed!"
        echo "================================================"
        echo ""
        echo "🎉 Your Firebase backend is now configured!"
        echo ""
        echo "Next steps:"
        echo "  1. Test your app to ensure everything works"
        echo "  2. Monitor the Firebase Console for any errors"
        echo "  3. Check index creation status (may take a few minutes)"
        echo ""
        ;;
    5)
        echo "👋 Exiting..."
        exit 0
        ;;
    *)
        echo "❌ Invalid option. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "📚 For more information, see FIREBASE_DEPLOYMENT.md"
echo ""
