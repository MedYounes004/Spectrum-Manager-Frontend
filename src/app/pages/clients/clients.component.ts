import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientService, Client, ClientStats, TypeClient, StatutClient } from '../../services/client.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clients.component.html',
  styleUrl: './clients.component.css'
})
export class ClientsComponent implements OnInit {
  clients: Client[] = [];
  filteredClients: Client[] = [];
  stats: ClientStats = { totalClients: 0, activeClients: 0, entreprises: 0, personnes: 0 };
  isLoading = true;
  errorMsg = '';

  // Search & Filter
  searchTerm = '';
  selectedType = '';
  selectedStatut = '';

  // Modals state
  showAddModal = false;
  showDetailsModal = false;
  showCreateAccountModal = false;
  isSubmitting = false;
  submitError = '';
  submitSuccess = '';

  // Forms payload
  newClient: Client = this.emptyForm();
  selectedClient: Client | null = null;

  // New Client + Account options
  createAccountForNewClient = false;
  accountUsername = '';
  accountPassword = '';

  // Existing Client Account creation modal fields
  targetClientForAccount: Client | null = null;
  existingAccountUsername = '';
  existingAccountEmail = '';
  existingAccountPassword = '';
  accountSubmitError = '';
  accountSubmitSuccess = '';
  isCreatingAccount = false;

  // Constants mapping
  readonly types: TypeClient[] = ['ENTREPRISE', 'PERSONNE'];
  readonly statuts: StatutClient[] = ['ACTIF', 'INACTIF'];

  readonly typeLabels: Record<TypeClient, string> = {
    ENTREPRISE: 'Entreprise / Morale',
    PERSONNE: 'Particulier / Physique'
  };

  readonly statutLabels: Record<StatutClient, string> = {
    ACTIF: 'Actif',
    INACTIF: 'Inactif'
  };

  readonly typeBadgeClass: Record<TypeClient, string> = {
    ENTREPRISE: 'badge-enterprise',
    PERSONNE: 'badge-person'
  };

  readonly statutBadgeClass: Record<StatutClient, string> = {
    ACTIF: 'badge-active',
    INACTIF: 'badge-inactive'
  };

  constructor(
    private clientService: ClientService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.refreshData();
  }

  refreshData(): void {
    this.loadClients();
    this.loadStats();
  }

  loadClients(): void {
    this.isLoading = true;
    this.errorMsg = '';
    this.clientService.getAllClients().subscribe({
      next: (data) => {
        this.clients = data;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMsg = err.status === 0
          ? 'Impossible de joindre le serveur. Vérifiez que la passerelle ou le service client est démarré.'
          : `Erreur ${err.status}: ${err.error?.message ?? 'Échec lors de la récupération des clients.'}`;
        this.isLoading = false;
      }
    });
  }

  loadStats(): void {
    this.clientService.getStats().subscribe({
      next: (stats) => {
        this.stats = stats;
      },
      error: () => {
        this.stats = this.calculateLocalStats();
      }
    });
  }

  calculateLocalStats(): ClientStats {
    const totalClients = this.clients.length;
    const activeClients = this.clients.filter(c => c.statut === 'ACTIF').length;
    const entreprises = this.clients.filter(c => c.type === 'ENTREPRISE').length;
    const personnes = this.clients.filter(c => c.type === 'PERSONNE').length;
    return { totalClients, activeClients, entreprises, personnes };
  }

  applyFilters(): void {
    const term = this.searchTerm.toLowerCase().trim();
    this.filteredClients = this.clients.filter((c) => {
      const matchesSearch = !term ||
        (c.codeClient && c.codeClient.toLowerCase().includes(term)) ||
        (c.nom && c.nom.toLowerCase().includes(term)) ||
        (c.prenom && c.prenom.toLowerCase().includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term)) ||
        (c.telephone && c.telephone.toLowerCase().includes(term)) ||
        (c.adresse && c.adresse.toLowerCase().includes(term)) ||
        (c.ville && c.ville.toLowerCase().includes(term));

      const matchesType = !this.selectedType || c.type === this.selectedType;
      const matchesStatut = !this.selectedStatut || c.statut === this.selectedStatut;

      return matchesSearch && matchesType && matchesStatut;
    });
  }

  openAddModal(): void {
    this.newClient = this.emptyForm();
    this.createAccountForNewClient = false;
    this.accountUsername = '';
    this.accountPassword = '';
    this.submitError = '';
    this.submitSuccess = '';
    this.showAddModal = true;
  }

  closeAddModal(): void {
    if (!this.isSubmitting) {
      this.showAddModal = false;
    }
  }

  onNewClientEmailChange(): void {
    if (this.createAccountForNewClient && !this.accountUsername && this.newClient.email) {
      this.accountUsername = this.newClient.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    }
  }

  openDetailsModal(client: Client): void {
    this.selectedClient = { ...client };
    this.submitError = '';
    this.submitSuccess = '';
    this.showDetailsModal = true;
  }

  closeDetailsModal(): void {
    if (!this.isSubmitting) {
      this.showDetailsModal = false;
      this.selectedClient = null;
    }
  }

  // Submit create new client (with optional user account)
  onAddSubmit(): void {
    this.submitError = '';
    this.submitSuccess = '';

    if (!this.newClient.nom || !this.newClient.email || !this.newClient.telephone) {
      this.submitError = 'Veuillez remplir tous les champs obligatoires (*).';
      return;
    }

    if (this.createAccountForNewClient) {
      if (!this.accountUsername || !this.accountPassword) {
        this.submitError = 'Veuillez saisir un nom d\'utilisateur et un mot de passe pour le compte d\'accès.';
        return;
      }
    }

    this.isSubmitting = true;

    // 1. Create client
    this.clientService.createClient(this.newClient).subscribe({
      next: (createdClient) => {
        // If user wants to create account simultaneously
        if (this.createAccountForNewClient) {
          this.userService.createUser({
            username: this.accountUsername,
            email: createdClient.email,
            password: this.accountPassword,
            firstName: createdClient.prenom || createdClient.nom,
            lastName: createdClient.nom,
            role: 'VIEWER',
            status: 'ACTIVE',
            company: createdClient.nom,
            phoneNumber: createdClient.telephone
          }).subscribe({
            next: (createdUser) => {
              // Link userId to client
              if (createdClient.id) {
                this.clientService.updateClient(createdClient.id, { userId: createdUser.id }).subscribe({
                  next: (updatedClient) => {
                    this.clients.unshift(updatedClient);
                    this.finishClientCreationSuccess(updatedClient.nom, true);
                  },
                  error: () => {
                    this.clients.unshift(createdClient);
                    this.finishClientCreationSuccess(createdClient.nom, false, 'Client créé mais échec de liaison de l\'ID utilisateur.');
                  }
                });
              }
            },
            error: (err) => {
              this.clients.unshift(createdClient);
              this.finishClientCreationSuccess(createdClient.nom, false, `Client créé mais erreur de création de compte : ${err.error?.message ?? 'inconnue'}`);
            }
          });
        } else {
          this.clients.unshift(createdClient);
          this.finishClientCreationSuccess(createdClient.nom, false);
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        this.submitError = err.error?.message ?? 'Erreur lors de la création du client. L\'email est peut-être déjà utilisé.';
      }
    });
  }

  private finishClientCreationSuccess(clientName: string, withAccount: boolean, extraMessage?: string): void {
    this.applyFilters();
    this.loadStats();
    this.isSubmitting = false;
    this.submitSuccess = withAccount
      ? `Client "${clientName}" et compte utilisateur d'accès portail créés avec succès !`
      : extraMessage ?? `Client "${clientName}" créé avec succès !`;
    setTimeout(() => this.closeAddModal(), 1500);
  }

  // Update Client info
  onUpdateSubmit(): void {
    if (!this.selectedClient || !this.selectedClient.id) return;
    this.submitError = '';
    this.submitSuccess = '';

    const id = this.selectedClient.id;
    this.isSubmitting = true;

    this.clientService.updateClient(id, this.selectedClient).subscribe({
      next: (updated) => {
        const idx = this.clients.findIndex(c => c.id === updated.id);
        if (idx !== -1) {
          this.clients[idx] = updated;
          this.applyFilters();
          this.loadStats();
        }
        this.isSubmitting = false;
        this.submitSuccess = 'Client mis à jour avec succès !';
        setTimeout(() => this.closeDetailsModal(), 1200);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.submitError = err.error?.message ?? 'Erreur lors de la mise à jour.';
      }
    });
  }

  // Modal for creating User Account for an EXISTING Client
  openCreateAccountModal(client: Client): void {
    this.targetClientForAccount = client;
    this.existingAccountEmail = client.email || '';
    // Generate clean suggested username with unique suffix to avoid 409 duplicate errors
    const baseName = (client.prenom ? `${client.prenom}.${client.nom}` : client.nom)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    const uniqueId = client.id ? client.id : Math.floor(100 + Math.random() * 900);
    this.existingAccountUsername = `clt_${baseName}_${uniqueId}`;
    this.existingAccountPassword = 'Client' + Math.floor(1000 + Math.random() * 9000) + '!';
    this.accountSubmitError = '';
    this.accountSubmitSuccess = '';
    this.showCreateAccountModal = true;
  }

  closeCreateAccountModal(): void {
    if (!this.isCreatingAccount) {
      this.showCreateAccountModal = false;
      this.targetClientForAccount = null;
    }
  }

  submitCreateAccountForExistingClient(): void {
    if (!this.targetClientForAccount || !this.targetClientForAccount.id) return;
    this.accountSubmitError = '';
    this.accountSubmitSuccess = '';

    if (!this.existingAccountUsername || !this.existingAccountEmail || !this.existingAccountPassword) {
      this.accountSubmitError = 'Veuillez remplir le nom d\'utilisateur, l\'email et le mot de passe.';
      return;
    }

    this.isCreatingAccount = true;
    const client = this.targetClientForAccount;

    // 1. Create user account with role 'CLIENT'
    this.userService.createUser({
      username: this.existingAccountUsername,
      email: this.existingAccountEmail,
      password: this.existingAccountPassword,
      firstName: client.prenom || client.nom,
      lastName: client.nom,
      role: 'VIEWER',
      status: 'ACTIVE',
      company: client.nom,
      phoneNumber: client.telephone
    }).subscribe({
      next: (createdUser) => {
        // 2. Link userId to Client
        if (client.id) {
          this.clientService.updateClient(client.id, { userId: createdUser.id }).subscribe({
            next: (updatedClient) => {
              const idx = this.clients.findIndex(c => c.id === updatedClient.id);
              if (idx !== -1) {
                this.clients[idx] = updatedClient;
                this.applyFilters();
              }
              if (this.selectedClient && this.selectedClient.id === updatedClient.id) {
                this.selectedClient.userId = updatedClient.userId;
              }
              this.isCreatingAccount = false;
              this.accountSubmitSuccess = `Compte utilisateur #${createdUser.id} créé et lié avec succès au client "${client.nom}" !`;
              setTimeout(() => this.closeCreateAccountModal(), 1600);
            },
            error: (err) => {
              this.isCreatingAccount = false;
              this.accountSubmitError = 'Compte créé mais erreur lors de la liaison au client : ' + (err.error?.message ?? 'inconnue');
            }
          });
        }
      },
      error: (err) => {
        this.isCreatingAccount = false;
        this.accountSubmitError = err.error?.message ?? 'Erreur lors de la création du compte utilisateur. Le nom d\'utilisateur ou l\'email existe déjà.';
      }
    });
  }

  changeStatut(client: Client, statut: StatutClient): void {
    if (!client.id) return;
    this.clientService.updateClientStatus(client.id, statut).subscribe({
      next: (updated) => {
        const idx = this.clients.findIndex(c => c.id === updated.id);
        if (idx !== -1) {
          this.clients[idx] = updated;
          this.applyFilters();
          this.loadStats();
        }
        if (this.selectedClient && this.selectedClient.id === client.id) {
          this.selectedClient.statut = statut;
        }
      },
      error: (err) => {
        alert(err.error?.message ?? 'Impossible de modifier le statut.');
      }
    });
  }

  onDelete(client: Client): void {
    if (!client.id) return;
    if (confirm(`Êtes-vous sûr de vouloir supprimer définitivement le client "${client.nom} ${client.prenom ?? ''}" ?\nAttention : cela peut briser des intégrités de facturation ou autorisation si des dossiers y font référence.`)) {
      this.clientService.deleteClient(client.id).subscribe({
        next: () => {
          this.clients = this.clients.filter(c => c.id !== client.id);
          this.applyFilters();
          this.loadStats();
          this.closeDetailsModal();
        },
        error: (err) => {
          alert(err.error?.message ?? 'Erreur lors de la suppression.');
        }
      });
    }
  }

  getInitials(client: Client): string {
    const s = `${client.nom.charAt(0)}${client.prenom?.charAt(0) ?? ''}`;
    return s.toUpperCase() || 'CL';
  }

  private emptyForm(): Client {
    return {
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      adresse: '',
      ville: '',
      codePostal: '',
      pays: 'Tunisie',
      type: 'ENTREPRISE',
      statut: 'ACTIF',
      secteurActivite: '',
      numeroFiscal: '',
      matricule: '',
      notes: ''
    };
  }
}
