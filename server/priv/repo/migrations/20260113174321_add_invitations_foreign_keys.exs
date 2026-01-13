defmodule PandemicVibeServer.Repo.Migrations.AddInvitationsForeignKeys do
  use Ecto.Migration

  def change do
    alter table(:invitations) do
      modify :game_id, references(:games, type: :binary_id, on_delete: :delete_all)
      modify :invited_by_id, references(:users, type: :binary_id, on_delete: :nilify_all)
    end
  end
end
