defmodule PandemicVibeServer.Games.Card do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "cards" do
    field :card_type, :string
    field :location, :string
    field :position, :integer

    belongs_to :game, PandemicVibeServer.Games.Game
    belongs_to :city, PandemicVibeServer.Games.City
    belongs_to :player, PandemicVibeServer.Games.Player

    timestamps(type: :utc_datetime)
  end

  @card_types ~w(city epidemic event)
  @locations ~w(player_deck player_hand player_discard infection_deck infection_discard)

  @doc false
  def changeset(card, attrs) do
    card
    |> cast(attrs, [:card_type, :location, :position, :game_id, :city_id, :player_id])
    |> validate_required([:card_type, :location, :game_id])
    |> validate_inclusion(:card_type, @card_types)
    |> validate_inclusion(:location, @locations)
  end
end
