defmodule InfestationServer.Repo.Migrations.CreateGameStates do
  use Ecto.Migration

  def change do
    create table(:game_states, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :game_id, references(:games, type: :binary_id, on_delete: :delete_all), null: false
      add :state_data, :map
      add :turn_number, :integer, default: 0
      add :current_player_id, references(:players, type: :binary_id)

      timestamps(type: :utc_datetime)
    end

    create index(:game_states, [:game_id])
    create index(:game_states, [:turn_number])
  end
end
