defmodule PandemicVibeServerWeb.GameControllerTest do
  use PandemicVibeServerWeb.ConnCase

  alias PandemicVibeServer.{Accounts, Games}

  setup do
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

    # Get tokens
    {:ok, token1, _claims} = PandemicVibeServer.Guardian.encode_and_sign(user1)
    {:ok, token2, _claims} = PandemicVibeServer.Guardian.encode_and_sign(user2)

    {:ok, user1: user1, user2: user2, token1: token1, token2: token2}
  end

  describe "POST /api/games" do
    test "creates a game with authenticated user", %{conn: conn, user1: user1, token1: token1} do
      conn =
        conn
        |> put_req_header("authorization", "Bearer #{token1}")
        |> post(~p"/api/games", %{game: %{difficulty: "normal"}})

      assert %{"data" => game_data} = json_response(conn, 201)
      assert game_data["difficulty"] == "normal"
      assert game_data["status"] == "lobby"
      assert game_data["created_by_id"] == user1.id
      assert length(game_data["players"]) == 1
      assert hd(game_data["players"])["user_id"] == user1.id
    end

    test "returns 401 without authentication", %{conn: conn} do
      conn = post(conn, ~p"/api/games", %{difficulty: "normal"})
      assert json_response(conn, 401)
    end
  end

  describe "GET /api/games/:id" do
    setup %{user1: user1, token1: _token1} do
      {:ok, game} =
        Games.create_game(%{
          difficulty: "easy",
          created_by_id: user1.id,
          status: "lobby"
        })

      {:ok, _player} = Games.add_player_to_game(game.id, user1.id)

      {:ok, game: game}
    end

    test "returns game details", %{conn: conn, token1: token1, game: game} do
      conn =
        conn
        |> put_req_header("authorization", "Bearer #{token1}")
        |> get(~p"/api/games/#{game.id}")

      assert %{"data" => game_data} = json_response(conn, 200)
      assert game_data["id"] == game.id
      assert game_data["difficulty"] == "easy"
    end
  end

  describe "POST /api/games/:id/join" do
    setup %{user1: user1, token1: _token1} do
      {:ok, game} =
        Games.create_game(%{
          difficulty: "normal",
          created_by_id: user1.id,
          status: "lobby"
        })

      {:ok, _player} = Games.add_player_to_game(game.id, user1.id)

      {:ok, game: game}
    end

    test "allows second player to join", %{conn: conn, token2: token2, game: game, user2: user2} do
      conn =
        conn
        |> put_req_header("authorization", "Bearer #{token2}")
        |> post(~p"/api/games/#{game.id}/join")

      assert %{"data" => game_data} = json_response(conn, 200)
      assert length(game_data["players"]) == 2

      player_ids = Enum.map(game_data["players"], & &1["user_id"])
      assert user2.id in player_ids
    end

    test "prevents joining same game twice", %{conn: conn, token1: token1, game: game} do
      conn =
        conn
        |> put_req_header("authorization", "Bearer #{token1}")
        |> post(~p"/api/games/#{game.id}/join")

      assert %{"error" => _} = json_response(conn, 400)
    end

    test "prevents joining full game", %{conn: conn, game: game} do
      # Add 3 more players (total 4)
      for i <- 1..3 do
        {:ok, user} =
          Accounts.register_user(%{
            email: "extra#{i}_#{System.unique_integer([:positive])}@example.com",
            password: "password123",
            name: "extra#{i}"
          })

        {:ok, _player} = Games.add_player_to_game(game.id, user.id)
      end

      # Try to add 5th player
      {:ok, user5} =
        Accounts.register_user(%{
          email: "extra5_#{System.unique_integer([:positive])}@example.com",
          password: "password123",
          name: "extra5"
        })

      {:ok, token5, _claims} = PandemicVibeServer.Guardian.encode_and_sign(user5)

      conn =
        conn
        |> put_req_header("authorization", "Bearer #{token5}")
        |> post(~p"/api/games/#{game.id}/join")

      assert %{"error" => _} = json_response(conn, 400)
    end
  end

  describe "GET /api/games" do
    setup %{user1: user1, user2: user2} do
      # Create games for user1
      {:ok, game1} =
        Games.create_game(%{
          difficulty: "easy",
          created_by_id: user1.id,
          status: "lobby"
        })

      {:ok, _player1} = Games.add_player_to_game(game1.id, user1.id)

      # Create game for user2, user1 joins
      {:ok, game2} =
        Games.create_game(%{
          difficulty: "hard",
          created_by_id: user2.id,
          status: "in_progress"
        })

      {:ok, _player2a} = Games.add_player_to_game(game2.id, user2.id)
      {:ok, _player2b} = Games.add_player_to_game(game2.id, user1.id)

      {:ok, game1: game1, game2: game2}
    end

    test "returns all games for user", %{conn: conn, token1: token1, game1: game1, game2: game2} do
      conn =
        conn
        |> put_req_header("authorization", "Bearer #{token1}")
        |> get(~p"/api/games")

      assert %{"data" => games} = json_response(conn, 200)
      assert length(games) == 2

      game_ids = Enum.map(games, & &1["id"])
      assert game1.id in game_ids
      assert game2.id in game_ids
    end
  end

  describe "POST /api/games/:id/start" do
    setup %{user1: user1, user2: user2, token1: _token1} do
      {:ok, game} =
        Games.create_game(%{
          difficulty: "normal",
          created_by_id: user1.id,
          status: "lobby"
        })

      {:ok, _player1} = Games.add_player_to_game(game.id, user1.id)
      {:ok, _player2} = Games.add_player_to_game(game.id, user2.id)

      {:ok, game: game}
    end

    test "creator can start game with 2+ players", %{conn: conn, token1: token1, game: game} do
      conn =
        conn
        |> put_req_header("authorization", "Bearer #{token1}")
        |> post(~p"/api/games/#{game.id}/start")

      assert %{"data" => game_data} = json_response(conn, 200)
      assert game_data["status"] == "in_progress"

      # Verify roles were assigned
      players = game_data["players"]
      assert Enum.all?(players, fn p -> p["role"] != nil end)
    end

    test "non-creator cannot start game", %{conn: conn, token2: token2, game: game} do
      conn =
        conn
        |> put_req_header("authorization", "Bearer #{token2}")
        |> post(~p"/api/games/#{game.id}/start")

      assert %{"error" => _} = json_response(conn, 400)
    end
  end
end
