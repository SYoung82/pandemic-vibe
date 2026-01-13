defmodule PandemicVibeServerWeb.FallbackController do
  use PandemicVibeServerWeb, :controller

  # Handle Ecto changeset errors
  def call(conn, {:error, %Ecto.Changeset{} = changeset}) do
    conn
    |> put_status(:unprocessable_entity)
    |> put_view(PandemicVibeServerWeb.ErrorJSON)
    |> render("422.json", changeset: changeset)
  end

  def call(conn, {:error, :not_found}) do
    conn |> put_status(:not_found) |> json(%{error: "not_found"})
  end

  def call(conn, {:error, reason}) do
    conn |> put_status(:bad_request) |> json(%{error: inspect(reason)})
  end
end
