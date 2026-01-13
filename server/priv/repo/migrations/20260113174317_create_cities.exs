defmodule PandemicVibeServer.Repo.Migrations.CreateCities do
  use Ecto.Migration

  def change do
    create table(:cities, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :color, :string, null: false
      add :population, :integer
      add :latitude, :float
      add :longitude, :float

      timestamps(type: :utc_datetime)
    end

    create unique_index(:cities, [:name])
    create index(:cities, [:color])
  end
end
