defmodule InfestationServer.Repo.Migrations.RenameToInfestationTerminology do
  use Ecto.Migration

  def change do
    # Rename game columns
    rename table(:games), :infection_rate_index, to: :infestation_rate_index

    # Rename cities table to planets (note: table also renamed in schema but keeping DB name for now)
    # The schema file uses Planet but references table "cities" for backwards compatibility

    # Rename player columns referencing cities
    rename table(:players), :current_city_id, to: :current_planet_id

    # Rename cards columns referencing cities
    rename table(:cards), :city_id, to: :planet_id

    # Rename city_connections columns
    rename table(:city_connections), :city_id, to: :planet_id
    rename table(:city_connections), :connected_city_id, to: :connected_planet_id
  end
end
