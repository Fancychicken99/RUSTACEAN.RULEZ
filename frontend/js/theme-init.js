try {
      const savedTheme = localStorage.getItem('northstar-crm-theme');
      document.documentElement.dataset.bsTheme = savedTheme === 'dark' || (!savedTheme && (new Date().getHours() >= 18 || new Date().getHours() < 6)) ? 'dark' : 'light';
    } catch {
      document.documentElement.dataset.bsTheme = 'light';
    }
