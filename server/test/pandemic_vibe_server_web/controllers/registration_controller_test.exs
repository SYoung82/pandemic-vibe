defmodule PandemicVibeServerWeb.RegistrationControllerTest do
  use PandemicVibeServerWeb.ConnCase

  alias PandemicVibeServer.Accounts

  @valid_attrs %{
    email: "test@example.com",
    name: "Test User",
    password: "password123"
  }

  @invalid_attrs %{
    email: "",
    name: "",
    password: "short"
  }

  describe "create/2" do
    test "creates user and returns JWT token when data is valid", %{conn: conn} do
      conn = post(conn, ~p"/api/register", user: @valid_attrs)

      assert %{
               "token" => token,
               "user" => %{
                 "id" => _id,
                 "email" => "test@example.com",
                 "name" => "Test User"
               }
             } = json_response(conn, 201)

      assert is_binary(token)
      assert String.length(token) > 0

      # Verify user was created
      assert Accounts.get_user_by_email("test@example.com")
    end

    test "returns error when email already exists", %{conn: conn} do
      {:ok, _user} = Accounts.register_user(@valid_attrs)

      conn = post(conn, ~p"/api/register", user: @valid_attrs)

      assert json_response(conn, 422)
    end

    test "returns error when data is invalid", %{conn: conn} do
      conn = post(conn, ~p"/api/register", user: @invalid_attrs)

      assert json_response(conn, 422)
    end
  end
end
