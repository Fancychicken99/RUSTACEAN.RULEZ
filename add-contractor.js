(() => {
  const form = document.getElementById('add-contractor-form');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const photo = formData.get('photo');
    const payload = {
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      phone: formData.get('phone'),
      email: formData.get('email'),
      organization: formData.get('organization'),
      region: formData.get('region'),
      country: formData.get('country'),
      citySector: formData.get('citySector'),
      photo: photo && photo.size > 0
        ? { name: photo.name, type: photo.type, size: photo.size }
        : null,
    };

    console.log(JSON.stringify(payload));
  });
})();
