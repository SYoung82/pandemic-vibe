defmodule PandemicVibeServer.Guardian do
  use Guardian, otp_app: :pandemic_vibe_server

  alias PandemicVibeServer.Accounts

  @impl true
  def subject_for_token(resource, _claims) do
    # Use the user's id as the subject
    sub = to_string(resource.id)
    {:ok, sub}
  end

  @impl true
  def resource_from_claims(%{"sub" => id}) do
    case Accounts.get_user!(id) do
      user -> {:ok, user}
    end
  rescue
    Ecto.NoResultsError -> {:error, :resource_not_found}
  end
end
