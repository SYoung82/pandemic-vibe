defmodule PandemicVibeServer.Games.CityConnection do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "city_connections" do
    belongs_to :city, PandemicVibeServer.Games.City
    belongs_to :connected_city, PandemicVibeServer.Games.City

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(city_connection, attrs) do
    city_connection
    |> cast(attrs, [:city_id, :connected_city_id])
    |> validate_required([:city_id, :connected_city_id])
    |> unique_constraint([:city_id, :connected_city_id])
  end
end
