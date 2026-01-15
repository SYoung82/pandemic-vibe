# Phoenix Channels - Game WebSocket API

## Overview

The Pandemic game uses Phoenix Channels for real-time multiplayer gameplay. Players connect to a game channel to receive live updates and send actions.

## Connection

### WebSocket URL
```
ws://localhost:4000/socket
```

### Authentication
Connect with a JWT token obtained from the login endpoint:

```javascript
import { Socket } from "phoenix"

const token = "your_jwt_token_here"
const socket = new Socket("ws://localhost:4000/socket", {
  params: { token: token }
})

socket.connect()
```

## Joining a Game Channel

```javascript
const gameId = "game-uuid-here"
const channel = socket.channel(`game:${gameId}`, {})

channel.join()
  .receive("ok", (response) => {
    console.log("Joined game:", response.game)
  })
  .receive("error", (error) => {
    console.log("Unable to join:", error)
  })
```

## Receiving Events

### Game State Updates
Broadcast to all players when game state changes:

```javascript
channel.on("game_state", (state) => {
  console.log("Game state updated:", state)
  // state contains: game, players, state, current_player_id, turn_number
})
```

### Chat Messages
```javascript
channel.on("chat_message", (message) => {
  console.log(`${message.player_name}: ${message.message}`)
})
```

## Sending Actions

### Get Current State
```javascript
channel.push("get_state", {})
  .receive("ok", (state) => console.log("Current state:", state))
  .receive("error", (error) => console.error("Error:", error))
```

### Player Actions

#### Move to a City
```javascript
channel.push("player_action", {
  action: "move",
  params: { city: "Atlanta" }
})
  .receive("ok", (response) => console.log(response.message))
  .receive("error", (error) => console.error(error.reason))
```

#### Treat Disease
```javascript
channel.push("player_action", {
  action: "treat_disease",
  params: { color: "blue" }
})
```

#### Build Research Station
```javascript
channel.push("player_action", {
  action: "build_station",
  params: {}
})
```

#### Discover Cure
```javascript
channel.push("player_action", {
  action: "discover_cure",
  params: {
    color: "red",
    card_ids: ["card-id-1", "card-id-2", "card-id-3", "card-id-4", "card-id-5"]
  }
})
```

#### Share Knowledge
```javascript
channel.push("player_action", {
  action: "share_knowledge",
  params: {
    receiver_id: "player-uuid",
    card_id: "card-uuid"
  }
})
```

### End Turn
```javascript
channel.push("end_turn", {})
  .receive("ok", () => console.log("Turn ended"))
  .receive("error", (error) => console.error(error.reason))
```

### Send Chat Message
```javascript
channel.push("chat_message", { message: "Hello everyone!" })
  .receive("ok", () => console.log("Message sent"))
```

## Error Handling

Common errors:
- `not_your_turn` - Attempted action when it's not your turn
- `not_a_player` - Tried to join a game you're not part of
- `no_actions_remaining` - No actions left this turn
- `no_disease_present` - Tried to treat disease that's not in the city

## Complete React Example

```typescript
import { Socket, Channel } from "phoenix"
import { useEffect, useState } from "react"

export function useGameChannel(gameId: string, token: string) {
  const [channel, setChannel] = useState<Channel | null>(null)
  const [gameState, setGameState] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])

  useEffect(() => {
    const socket = new Socket("ws://localhost:4000/socket", {
      params: { token }
    })

    socket.connect()

    const gameChannel = socket.channel(`game:${gameId}`, {})

    gameChannel.on("game_state", (state) => {
      setGameState(state)
    })

    gameChannel.on("chat_message", (message) => {
      setMessages((prev) => [...prev, message])
    })

    gameChannel.join()
      .receive("ok", () => console.log("Joined"))
      .receive("error", (err) => console.error("Error:", err))

    setChannel(gameChannel)

    return () => {
      gameChannel.leave()
      socket.disconnect()
    }
  }, [gameId, token])

  const sendAction = (action: string, params: any) => {
    return channel?.push("player_action", { action, params })
  }

  const endTurn = () => {
    return channel?.push("end_turn", {})
  }

  const sendMessage = (message: string) => {
    return channel?.push("chat_message", { message })
  }

  return {
    gameState,
    messages,
    sendAction,
    endTurn,
    sendMessage
  }
}
```

## Testing

Run channel tests:
```bash
mix test test/pandemic_vibe_server_web/channels/
```
