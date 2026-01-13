defmodule PandemicVibeServer.Repo do
  use Ecto.Repo,
    otp_app: :pandemic_vibe_server,
    adapter: Ecto.Adapters.Postgres
end
