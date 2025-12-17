# Testing Instructions

## Step 1: Get Your API Key
Go to https://aistudio.google.com/app/apikey and create a free API key

## Step 2: Start the Server
Open Terminal and run:
```
cd "/Users/user/Desktop/das 1"
export API_KEY="YOUR_API_KEY_HERE"
npm start
```

You should see:
```
✅ Server running on http://localhost:3000
🔑 API_KEY status: SET ✅
Ready to receive messages...
```

## Step 3: Test in Browser
1. Open `index.html` in your browser (double-click the file)
2. Type a message like "Hello"
3. Click "Send"
4. Watch the Terminal for logs

## Expected Terminal Output (Success):
```
📨 Received message: Hello
🚀 Sending request to Google API...
📡 Response status: 200
📦 Raw Google response: {...}
✅ Successfully extracted response text
✅ Sending response to client
```

## If You See Errors:
Copy the Terminal output and share it so I can fix it.
