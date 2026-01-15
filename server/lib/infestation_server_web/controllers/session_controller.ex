defmodule InfestationServerWeb.SessionController do
  use InfestationServerWeb, :controller

  alias InfestationServer.{Accounts, Guardian}

  action_fallback InfestationServerWeb.FallbackController

  def create(conn, %{"email" => email, "password" => password}) do
    case Accounts.authenticate_user(email, password) do
      {:ok, user} ->
        {:ok, token, _claims} = Guardian.encode_and_sign(user)
        conn |> json(%{token: token, user: %{id: user.id, email: user.email, name: user.name}})

      {:error, :invalid_credentials} ->
        conn |> put_status(:unauthorized) |> json(%{error: "invalid_credentials"})
    end
  end
end
