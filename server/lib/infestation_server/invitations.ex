defmodule InfestationServer.Invitations do
  @moduledoc "Invitation helpers."

  import Ecto.Query, warn: false
  alias InfestationServer.Repo
  alias InfestationServer.Invitations.Invitation

  def create_invitation(attrs) do
    token = attrs[:token] || Ecto.UUID.generate()
    attrs = Map.put(attrs, :token, token)

    %Invitation{}
    |> Invitation.changeset(attrs)
    |> Repo.insert()
  end

  def get_by_token(token) when is_binary(token) do
    Repo.get_by(Invitation, token: token)
  end

  def accept_invitation(invitation) do
    invitation
    |> Invitation.changeset(%{accepted_at: DateTime.utc_now()})
    |> Repo.update()
  end
end
