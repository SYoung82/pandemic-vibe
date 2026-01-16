defmodule InfestationServer.Repo do
  use Ecto.Repo,
    otp_app: :infestation_server,
    adapter: Ecto.Adapters.Postgres
end
