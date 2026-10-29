const API_BASE_URL = "http://localhost:8080/api";

export async function getApplications() {
  const response = await fetch(`${API_BASE_URL}/applications`);

  if (!response.ok) {
    throw new Error("Failed to fetch applications");
  }

  return response.json();
}

export async function createApplication(application) {
  const response = await fetch(`${API_BASE_URL}/applications`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(application),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || "Failed to create application");

    error.response = data;

    throw error;
  }

  return data;
}


export async function updateApplication(id, application) {
  const response = await fetch(`${API_BASE_URL}/applications/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(application),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(
      data.message || "Failed to update application",
    );

    error.response = data;
    throw error;
  }

  return data;
}


export async function deleteApplication(id) {
  const response = await fetch(`${API_BASE_URL}/applications/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    let message = "Failed to delete application";

    try {
      const data = await response.json();
      message = data.message || message;
    } catch {
      // The server may return an empty response.
    }

    throw new Error(message);
  }
}
