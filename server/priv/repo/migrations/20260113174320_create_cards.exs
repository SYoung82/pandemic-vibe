defmodule PandemicVibeServer.Repo.Migrations.CreateCards do
  use Ecto.Migration

  def change do
    create table(:cards, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :game_id, references(:games, type: :binary_id, on_delete: :delete_all), null: false
      add :card_type, :string, null: false
      add :city_id, references(:cities, type: :binary_id)
      add :location, :string, null: false
      add :player_id, references(:players, type: :binary_id, on_delete: :nilify_all)
      add :position, :integer

      timestamps(type: :utc_datetime)
    end

    create index(:cards, [:game_id])
    create index(:cards, [:player_id])
    create index(:cards, [:location])
    create index(:cards, [:game_id, :location, :position])
  end
end
