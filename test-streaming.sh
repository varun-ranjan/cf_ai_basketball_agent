#!/bin/bash

echo "🏀 Testing Basketball Expert Agent - Streaming Implementation"
echo "============================================================"
echo ""

echo "✅ Test 1: Server Health Check"
echo "------------------------------"
curl -s http://localhost:8787 > /dev/null && echo "✓ Server is running" || echo "✗ Server is not responding"
echo ""

echo "✅ Test 2: Get Initial State"
echo "------------------------------"
curl -s http://localhost:8787/state | jq '.'
echo ""

echo "✅ Test 3: Send Chat Message (Streaming)"
echo "------------------------------"
echo "Sending: 'What is a pick and roll?'"
echo ""
curl -N -X POST http://localhost:8787/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What is a pick and roll?"}' 2>&1 | head -20
echo ""
echo ""

echo "✅ Test 4: Check State After Message"
echo "------------------------------"
sleep 2
curl -s http://localhost:8787/state | jq '.'
echo ""

echo "✅ Test 5: Send Another Message"
echo "------------------------------"
echo "Sending: 'How do I defend it?'"
echo ""
curl -N -X POST http://localhost:8787/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"How do I defend it?"}' 2>&1 | head -20
echo ""
echo ""

echo "✅ Test 6: Reset Conversation"
echo "------------------------------"
curl -s -X POST http://localhost:8787/reset | jq '.'
echo ""

echo "✅ Test 7: Verify Reset"
echo "------------------------------"
curl -s http://localhost:8787/state | jq '.'
echo ""

echo "============================================================"
echo "🎉 All tests completed!"
echo ""
echo "📝 Summary:"
echo "   - Server: Running on http://localhost:8787"
echo "   - LLM: Workers AI (Llama 3.1 8B Instruct)"
echo "   - Workflow: Durable Objects with SQLite"
echo "   - User Input: Chat interface"
echo "   - Memory: Persistent state storage"
echo "   - Streaming: Server-Sent Events (SSE)"
echo ""
echo "🌐 Open http://localhost:8787 in your browser to try it!"

