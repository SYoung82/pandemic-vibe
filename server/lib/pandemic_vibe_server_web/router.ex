defmodule PandemicVibeServerWeb.Router do
  use PandemicVibeServerWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  pipeline :auth do
    plug Guardian.Plug.Pipeline,
      module: PandemicVibeServer.Guardian,
      error_handler: PandemicVibeServerWeb.AuthErrorHandler

    plug Guardian.Plug.VerifyHeader, scheme: "Bearer"
    plug Guardian.Plug.LoadResource
  end

  scope "/api", PandemicVibeServerWeb do
    pipe_through :api

    post "/register", RegistrationController, :create
    post "/login", SessionController, :create

    scope "/invitations" do
      post "/accept", InvitationController, :accept

      pipe_through :auth
      post "/", InvitationController, :create
    end

    scope "/" do
      pipe_through :auth

      resources "/games", GameController, only: [:index, :create, :show] do
        post "/join", GameController, :join
        post "/start", GameController, :start
        get "/state", GameController, :state
      end
    end
  end

  # Enable LiveDashboard and Swoosh mailbox preview in development
  if Application.compile_env(:pandemic_vibe_server, :dev_routes) do
    # If you want to use the LiveDashboard in production, you should put
    # it behind authentication and allow only admins to access it.
    # If your application does not have an admins-only section yet,
    # you can use Plug.BasicAuth to set up some basic authentication
    # as long as you are also using SSL (which you should anyway).
    import Phoenix.LiveDashboard.Router

    scope "/dev" do
      pipe_through [:fetch_session, :protect_from_forgery]

      live_dashboard "/dashboard", metrics: PandemicVibeServerWeb.Telemetry
      forward "/mailbox", Plug.Swoosh.MailboxPreview
    end
  end
end
