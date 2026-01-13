defmodule PandemicVibeServer.Repo.Migrations.CreateInvitations do
  use Ecto.Migration

  def change do
    create table(:invitations, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :token, :string, null: false
      add :email, :string, null: false
      add :game_id, :binary_id
      add :invited_by_id, :binary_id
      add :accepted_at, :utc_datetime

      timestamps(type: :utc_datetime)
    end

    create unique_index(:invitations, [:token])
    create index(:invitations, [:email])
  end
end
