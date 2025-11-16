# WebRTC Connection Troubleshooting Guide

## Issue: "could not establish pc connection"

### Symptoms
- ✅ WebSocket connects successfully
- ✅ Token is valid
- ✅ ICE candidates are exchanged
- ✅ SDP negotiation happens
- ❌ Peer connection fails after ~14 seconds
- ❌ Connection drops with code 1006

### Root Cause
This is a **NAT traversal/firewall issue**. WebRTC requires:
1. **Signaling** (WebSocket) - ✅ Works
2. **Media connection** (UDP peer-to-peer) - ❌ Blocked

The peer connection fails because UDP traffic is being blocked by:
- Corporate/school firewalls
- Restrictive Wi-Fi networks
- Mobile carriers blocking UDP
- NAT devices not allowing traversal

### Solutions

#### 1. Test on Different Network (Quickest Test)
- Switch to mobile data (4G/5G) instead of Wi-Fi
- Try a personal hotspot
- Test on a different network (home vs. public)

#### 2. Check Network Configuration
If you control the network:
- Ensure UDP ports are open (typically 10000-20000)
- Disable SIP ALG if using a router
- Check firewall rules

#### 3. Android Network Security Configuration
Some Android networks require explicit permission for WebRTC. Check:
- Settings → Network → Advanced → Private DNS
- Ensure the app has INTERNET permission (already in app.json)

#### 4. STUN/TURN Server Configuration
The ElevenLabs SDK should handle this automatically, but you can verify:
- Check if your network allows connections to STUN servers
- Some networks block STUN/TURN servers (common in corporate networks)

#### 5. Mobile Data vs Wi-Fi
If it works on mobile data but not Wi-Fi:
- Wi-Fi router/firewall is blocking UDP
- Contact network administrator or use mobile data

#### 6. VPN Issues
If using VPN:
- Disable VPN and test
- Some VPNs interfere with WebRTC

### What the Code Shows

Looking at line 220 in your logs:
```
LOG  ❌ Disconnected from conversation {"reason": "user"}
```

This suggests the SDK is detecting a failed connection and disconnecting. The "reason": "user" might be misleading - it could be auto-disconnecting due to peer connection failure.

### Next Steps

1. **Immediate Test**: Try on mobile data (4G/5G) instead of Wi-Fi
2. **If mobile data works**: Your Wi-Fi network is blocking WebRTC
3. **If mobile data doesn't work**: Contact ElevenLabs support - may be agent configuration issue
4. **Check ElevenLabs Dashboard**: Verify the agent is active and configured correctly

### Technical Details

The WebRTC connection process:
1. WebSocket connects (signaling channel) ✅
2. Client requests to join room ✅
3. Server sends SDP offer ✅
4. Client generates SDP answer ✅
5. ICE candidates exchanged ✅
6. **Attempts to establish peer connection** ❌ FAILS HERE
7. Connection times out after ~14 seconds
8. SDK disconnects

The failure at step 6 indicates NAT/firewall blocking UDP traffic.



