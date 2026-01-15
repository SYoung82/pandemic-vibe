defmodule InfestationServerWeb.InvitationController do
  use InfestationServerWeb, :controller

  alias InfestationServer.Invitations
  alias InfestationServer.Guardian

  action_fallback InfestationServerWeb.FallbackController

  def create(conn, %{"email" => email, "game_id" => game_id}) do
    inviter = Guardian.Plug.current_resource(conn)
    attrs = %{email: email, game_id: game_id, invited_by_id: inviter && inviter.id}

    case Invitations.create_invitation(attrs) do
      {:ok, inv} ->
        conn |> put_status(:created) |> json(%{token: inv.token, invitation_id: inv.id})

      {:error, changeset} ->
        conn |> put_status(:bad_request) |> json(%{errors: changeset})
    end
  end

  def accept(conn, %{"token" => token}) do
    case Invitations.get_by_token(token) do
      nil ->
        conn |> put_status(:not_found) |> json(%{error: "not_found"})

      inv ->
        {:ok, _} = Invitations.accept_invitation(inv)
        conn |> json(%{ok: true})
    end
  end
end
