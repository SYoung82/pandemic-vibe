defmodule InfestationServerWeb.SessionControllerTest do
  use InfestationServerWeb.ConnCase, async: true

  import InfestationServer.AccountsFixtures

  describe "create/2 - login" do
    setup do
      user =
        user_fixture(%{
          email: "login@example.com",
          name: "Login User",
          password: "password123"
        })

      %{user: user}
    end

    test "returns JWT token when credentials are valid", %{conn: conn, user: user} do
      conn =
        post(conn, ~p"/api/login", %{
          email: user.email,
          password: "password123"
        })

      assert %{
               "token" => token,
               "user" => %{
                 "id" => id,
                 "email" => "login@example.com",
                 "name" => "Login User"
               }
             } = json_response(conn, 200)

      assert is_binary(token)
      assert String.length(token) > 0
      assert id == user.id
    end

    test "returns error when password is incorrect", %{conn: conn, user: user} do
      conn =
        post(conn, ~p"/api/login", %{
          email: user.email,
          password: "wrongpassword"
        })

      assert %{"error" => "invalid_credentials"} = json_response(conn, 401)
    end

    test "returns error when email does not exist", %{conn: conn} do
      conn =
        post(conn, ~p"/api/login", %{
          email: "nonexistent@example.com",
          password: "password123"
        })

      assert %{"error" => "invalid_credentials"} = json_response(conn, 401)
    end
  end
end
