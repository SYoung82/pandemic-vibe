# This file is responsible for configuring your application
# and its dependencies with the aid of the Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.

# General application configuration
import Config

config :pandemic_vibe_server,
  ecto_repos: [PandemicVibeServer.Repo],
  generators: [timestamp_type: :utc_datetime, binary_id: true]

# Configure the endpoint
config :pandemic_vibe_server, PandemicVibeServerWeb.Endpoint,
  url: [host: "localhost"],
  adapter: Bandit.PhoenixAdapter,
  render_errors: [
    formats: [json: PandemicVibeServerWeb.ErrorJSON],
    layout: false
  ],
  pubsub_server: PandemicVibeServer.PubSub,
  live_view: [signing_salt: "3VXz/0Vy"]

# Configure the mailer
#
# By default it uses the "Local" adapter which stores the emails
# locally. You can see the emails in your browser, at "/dev/mailbox".
#
# For production it's recommended to configure a different adapter
# at the `config/runtime.exs`.
config :pandemic_vibe_server, PandemicVibeServer.Mailer, adapter: Swoosh.Adapters.Local

# Configure Elixir's Logger
config :logger, :default_formatter,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# Guardian (JWT) configuration - replace `secret_key` for production
config :pandemic_vibe_server, PandemicVibeServer.Guardian,
  issuer: "pandemic_vibe_server",
  secret_key: "change_me_replace_in_prod"

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{config_env()}.exs"
