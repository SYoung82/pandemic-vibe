defmodule PandemicVibeServer.AccountsFixtures do
  @moduledoc """
  This module defines test helpers for creating
  entities via the `PandemicVibeServer.Accounts` context.
  """

  @doc """
  Generate a user.
  """
  def user_fixture(attrs \\ %{}) do
    {:ok, user} =
      attrs
      |> Enum.into(%{
        email: "user#{System.unique_integer([:positive])}@example.com",
        name: "Test User",
        password: "password123"
      })
      |> PandemicVibeServer.Accounts.register_user()

    user
  end
end
