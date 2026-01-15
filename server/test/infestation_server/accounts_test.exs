defmodule InfestationServer.AccountsTest do
  use InfestationServer.DataCase, async: true

  alias InfestationServer.Accounts

  describe "users" do
    alias InfestationServer.Accounts.User

    import InfestationServer.AccountsFixtures

    test "register_user/1 with valid data creates a user" do
      valid_attrs = %{name: "Test User", email: "test@example.com", password: "password123"}

      assert {:ok, %User{} = user} = Accounts.register_user(valid_attrs)
      assert user.name == "Test User"
      assert user.email == "test@example.com"
      assert user.password_hash != nil
      assert user.password_hash != "password123"
    end

    test "register_user/1 with invalid email returns error changeset" do
      invalid_attrs = %{name: "Test", email: "invalid", password: "password123"}
      assert {:error, %Ecto.Changeset{}} = Accounts.register_user(invalid_attrs)
    end

    test "register_user/1 with short password returns error changeset" do
      invalid_attrs = %{name: "Test", email: "test@example.com", password: "short"}
      assert {:error, %Ecto.Changeset{}} = Accounts.register_user(invalid_attrs)
    end

    test "get_user_by_email/1 returns user when exists" do
      user = user_fixture()
      assert Accounts.get_user_by_email(user.email).id == user.id
    end

    test "get_user_by_email/1 returns nil when user does not exist" do
      assert Accounts.get_user_by_email("nonexistent@example.com") == nil
    end

    test "authenticate_user/2 with valid credentials returns user" do
      user = user_fixture(%{email: "auth@example.com", password: "password123"})
      assert {:ok, returned_user} = Accounts.authenticate_user("auth@example.com", "password123")
      assert returned_user.id == user.id
    end

    test "authenticate_user/2 with invalid password returns error" do
      user_fixture(%{email: "auth@example.com", password: "password123"})

      assert {:error, :invalid_credentials} =
               Accounts.authenticate_user("auth@example.com", "wrongpassword")
    end

    test "authenticate_user/2 with non-existent email returns error" do
      assert {:error, :invalid_credentials} =
               Accounts.authenticate_user("nonexistent@example.com", "password123")
    end
  end
end
