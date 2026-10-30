try {
      document.documentElement.dataset.bsTheme = localStorage.getItem('northstar-crm-theme') === 'dark' ? 'dark' : 'light';
    } catch {
      document.documentElement.dataset.bsTheme = 'light';
    }
