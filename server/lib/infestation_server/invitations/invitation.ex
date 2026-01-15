defmodule InfestationServer.Invitations.Invitation do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "invitations" do
    field :token, :string
    field :email, :string
    field :accepted_at, :utc_datetime

    belongs_to :game, InfestationServer.Games.Game
    belongs_to :invited_by, InfestationServer.Accounts.User

    timestamps(type: :utc_datetime)
  end

  def changeset(invitation, attrs) do
    invitation
    |> cast(attrs, [:token, :email, :game_id, :invited_by_id, :accepted_at])
    |> validate_required([:token, :email])
    |> foreign_key_constraint(:game_id)
    |> foreign_key_constraint(:invited_by_id)
  end
end
