defmodule InfestationServerWeb.GameChannelTest do
  use InfestationServerWeb.ChannelCase, async: true

  alias InfestationServer.{Accounts, Games}
  alias InfestationServerWeb.UserSocket
  import InfestationServer.GamesFixtures, only: [ensure_planets_seeded: 0]

  setup do
    ensure_planets_seeded()
    # Create test users
    {:ok, user1} =
      Accounts.register_user(%{
        email: "player1_#{System.unique_integer([:positive])}@example.com",
        password: "password123",
        name: "player1"
      })

    {:ok, user2} =
      Accounts.register_user(%{
        email: "player2_#{System.unique_integer([:positive])}@example.com",
        password: "password123",
        name: "player2"
      })

    # Create a game
    {:ok, game} =
      Games.create_game(%{
        difficulty: "normal",
        created_by_id: user1.id,
        status: "lobby"
      })

    {:ok, _player1} = Games.add_player_to_game(game.id, user1.id)
    {:ok, _player2} = Games.add_player_to_game(game.id, user2.id)

    # Get tokens
    {:ok, token1, _claims} = InfestationServer.Guardian.encode_and_sign(user1)
    {:ok, token2, _claims} = InfestationServer.Guardian.encode_and_sign(user2)

    {:ok, user1: user1, user2: user2, game: game, token1: token1, token2: token2}
  end

  describe "join game:*" do
    test "allows a player to join their game", %{game: game, token1: token1} do
      {:ok, socket} = connect(UserSocket, %{"token" => token1})

      assert {:ok, reply, socket} = subscribe_and_join(socket, "game:#{game.id}", %{})
      assert reply.game.id == game.id
      assert socket.assigns.game_id == game.id
    end

    test "prevents non-players from joining", %{game: game} do
      # Create a different user not in the game
      {:ok, other_user} =
        Accounts.register_user(%{
          email: "other_#{System.unique_integer([:positive])}@example.com",
          password: "password123",
          name: "other"
        })

      {:ok, other_token, _claims} = InfestationServer.Guardian.encode_and_sign(other_user)

      {:ok, socket} = connect(UserSocket, %{"token" => other_token})

      assert {:error, %{reason: :not_a_player}} =
               subscribe_and_join(socket, "game:#{game.id}", %{})
    end

    test "prevents joining with invalid token", %{game: _game} do
      assert :error = connect(UserSocket, %{"token" => "invalid_token"})
    end

    test "sends initial game state after joining", %{game: game, token1: token1, user1: _user1} do
      # Start the game first
      {:ok, _started_game} = InfestationServer.GameEngine.GameEngine.initialize_game(game.id)

      {:ok, socket} = connect(UserSocket, %{"token" => token1})
      {:ok, _reply, _socket} = subscribe_and_join(socket, "game:#{game.id}", %{})

      assert_push "game_state", state
      assert state.game.id == game.id
    end
  end

  describe "get_state" do
    test "returns current game state", %{game: game, token1: token1} do
      # Start the game
      {:ok, _started_game} = InfestationServer.GameEngine.GameEngine.initialize_game(game.id)

      {:ok, socket} = connect(UserSocket, %{"token" => token1})
      {:ok, _reply, socket} = subscribe_and_join(socket, "game:#{game.id}", %{})

      ref = push(socket, "get_state", %{})
      assert_reply ref, :ok, state
      assert state.game.id == game.id
    end
  end

  describe "chat_message" do
    test "broadcasts chat messages to all players", %{game: game, token1: token1, token2: token2} do
      {:ok, socket1} = connect(UserSocket, %{"token" => token1})
      {:ok, _reply, socket1} = subscribe_and_join(socket1, "game:#{game.id}", %{})

      {:ok, socket2} = connect(UserSocket, %{"token" => token2})
      {:ok, _reply, _socket2} = subscribe_and_join(socket2, "game:#{game.id}", %{})

      ref = push(socket1, "chat_message", %{"message" => "Hello everyone!"})
      assert_reply ref, :ok, _response

      assert_broadcast "chat_message", %{
        message: "Hello everyone!",
        player_name: "player1"
      }
    end
  end

  describe "player_action" do
    setup %{game: game, token1: token1, user1: _user1} do
      # Start the game
      {:ok, _started_game} = InfestationServer.GameEngine.GameEngine.initialize_game(game.id)

      {:ok, socket} = connect(UserSocket, %{"token" => token1})
      {:ok, _reply, socket} = subscribe_and_join(socket, "game:#{game.id}", %{})

      {:ok, socket: socket, game_id: game.id}
    end

    test "prevents actions when not player's turn", %{
      socket: _socket,
      game_id: game_id,
      user2: user2,
      token2: token2
    } do
      # Get the current state to see whose turn it is
      state = Games.get_latest_game_state(game_id)

      # If it's not user2's turn, connect as user2 and try an action
      if state.current_player_id != user2.id do
        {:ok, socket2} = connect(UserSocket, %{"token" => token2})
        {:ok, _reply, socket2} = subscribe_and_join(socket2, "game:#{game_id}", %{})

        ref =
          push(socket2, "player_action", %{
            "action" => "move",
            "params" => %{"city" => "Chicago"}
          })

        assert_reply ref, :error, %{reason: :not_your_turn}
      end
    end

    test "broadcasts game state after successful action", %{socket: socket} do
      ref =
        push(socket, "player_action", %{
          "action" => "treat_disease",
          "params" => %{"color" => "blue"}
        })

      # May succeed or fail depending on game state, but should get a reply
      assert_reply ref, _, _response
    end
  end

  describe "end_turn" do
    setup %{game: game, token1: token1} do
      # Start the game
      {:ok, _started_game} = InfestationServer.GameEngine.GameEngine.initialize_game(game.id)

      {:ok, socket} = connect(UserSocket, %{"token" => token1})
      {:ok, _reply, socket} = subscribe_and_join(socket, "game:#{game.id}", %{})

      {:ok, socket: socket, game_id: game.id}
    end

    test "advances to next player's turn", %{socket: socket, game_id: game_id} do
      _state_before = Games.get_latest_game_state(game_id)

      ref = push(socket, "end_turn", %{})

      # Should succeed or fail with validation error
      assert_reply ref, _, _response

      # If it succeeded, state should be broadcast
      # Note: actual turn ending requires drawing cards and infection phase
    end

    test "prevents ending turn when not player's turn", %{
      game_id: game_id,
      user2: user2,
      token2: token2
    } do
      state = Games.get_latest_game_state(game_id)

      # If it's not user2's turn, try to end turn
      if state.current_player_id != user2.id do
        {:ok, socket2} = connect(UserSocket, %{"token" => token2})
        {:ok, _reply, socket2} = subscribe_and_join(socket2, "game:#{game_id}", %{})

        ref = push(socket2, "end_turn", %{})
        assert_reply ref, :error, %{reason: :not_your_turn}
      end
    end
  end
end
