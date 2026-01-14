defmodule PandemicVibeServerWeb.InvitationControllerTest do
  use PandemicVibeServerWeb.ConnCase, async: true

  import PandemicVibeServer.AccountsFixtures

  alias PandemicVibeServer.Guardian

  describe "create/2 - create invitation" do
    setup do
      user = user_fixture()
      {:ok, token, _claims} = Guardian.encode_and_sign(user)
      {:ok, game} = PandemicVibeServer.Games.create_game(%{created_by_id: user.id})

      %{user: user, token: token, game: game}
    end

    test "creates invitation when authenticated and returns token", %{
      conn: conn,
      token: token,
      game: game
    } do
      game_id = game.id

      conn =
        conn
        |> put_req_header("authorization", "Bearer #{token}")
        |> post(~p"/api/invitations", %{
          email: "invitee@example.com",
          game_id: game_id
        })

      assert %{
               "token" => invite_token,
               "invitation_id" => invitation_id
             } = json_response(conn, 201)

      assert is_binary(invite_token)
      assert is_binary(invitation_id)
    end

    test "returns 401 when not authenticated", %{conn: conn, game: game} do
      game_id = game.id

      conn =
        post(conn, ~p"/api/invitations", %{
          email: "invitee@example.com",
          game_id: game_id
        })

      assert json_response(conn, 401)
    end
  end

  describe "accept/2 - accept invitation" do
    test "accepts invitation with valid token", %{conn: conn} do
      # Create an invitation first
      user = user_fixture()
      {:ok, token, _claims} = Guardian.encode_and_sign(user)
      {:ok, game} = PandemicVibeServer.Games.create_game(%{created_by_id: user.id})
      game_id = game.id

      create_conn =
        conn
        |> put_req_header("authorization", "Bearer #{token}")
        |> post(~p"/api/invitations", %{
          email: "invitee@example.com",
          game_id: game_id
        })

      %{"token" => invite_token} = json_response(create_conn, 201)

      # Now accept it
      conn = post(conn, ~p"/api/invitations/accept", %{token: invite_token})

      assert %{"ok" => true} = json_response(conn, 200)
    end

    test "returns 404 when token does not exist", %{conn: conn} do
      conn = post(conn, ~p"/api/invitations/accept", %{token: "nonexistent-token"})

      assert %{"error" => "not_found"} = json_response(conn, 404)
    end
  end
end
