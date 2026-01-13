defmodule PandemicVibeServer.Repo.Migrations.MakePlayerRoleNullable do
  use Ecto.Migration

  def change do
    alter table(:players) do
      modify :role, :string, null: true, from: {:string, null: false}
    end
  end
end
