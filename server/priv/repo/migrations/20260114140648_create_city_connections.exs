defmodule PandemicVibeServer.Repo.Migrations.CreateCityConnections do
  use Ecto.Migration

  def change do
    create table(:city_connections, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :city_id, references(:cities, type: :binary_id, on_delete: :delete_all), null: false

      add :connected_city_id, references(:cities, type: :binary_id, on_delete: :delete_all),
        null: false

      timestamps(type: :utc_datetime)
    end

    create index(:city_connections, [:city_id])
    create index(:city_connections, [:connected_city_id])
    create unique_index(:city_connections, [:city_id, :connected_city_id])
  end
end
