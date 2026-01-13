defmodule PandemicVibeServerWeb.RegistrationController do
  use PandemicVibeServerWeb, :controller

  alias PandemicVibeServer.Accounts
  alias PandemicVibeServer.Guardian

  action_fallback PandemicVibeServerWeb.FallbackController

  def create(conn, %{"user" => user_params}) do
    with {:ok, user} <- Accounts.register_user(user_params),
         {:ok, token, _claims} <- Guardian.encode_and_sign(user) do
      conn
      |> put_status(:created)
      |> json(%{token: token, user: %{id: user.id, email: user.email, name: user.name}})
    end
  end
end
