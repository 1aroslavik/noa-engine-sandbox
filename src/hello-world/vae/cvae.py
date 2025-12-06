import torch
import torch.nn as nn

class CVAE(nn.Module):
    def __init__(self, z_dim, cond_dim, img_channels=3, img_size=32):
        super().__init__()
        self.z_dim = z_dim
        self.cond_dim = cond_dim
        self.img_size = img_size

        self.enc = nn.Sequential(
            nn.Conv2d(img_channels + cond_dim, 64, 4, 2, 1),
            nn.ReLU(),
            nn.Conv2d(64, 128, 4, 2, 1),
            nn.ReLU(),
            nn.Conv2d(128, 256, 4, 2, 1),
            nn.ReLU(),
        )

        flat = 256 * (img_size // 8) * (img_size // 8)
        self.fc_mu = nn.Linear(flat, z_dim)
        self.fc_logvar = nn.Linear(flat, z_dim)
        self.fc_dec = nn.Linear(z_dim + cond_dim, flat)

        self.dec = nn.Sequential(
            nn.ConvTranspose2d(256, 128, 4, 2, 1),
            nn.ReLU(),
            nn.ConvTranspose2d(128, 64, 4, 2, 1),
            nn.ReLU(),
            nn.ConvTranspose2d(64, img_channels, 4, 2, 1),
            nn.Sigmoid(),
        )

    def encode(self, x, c):
        B = x.size(0)
        c = c.view(B, self.cond_dim, 1, 1).expand(B, self.cond_dim, x.size(2), x.size(3))
        h = self.enc(torch.cat([x, c], dim=1))
        h = h.view(B, -1)
        mu = self.fc_mu(h)
        logvar = self.fc_logvar(h)
        return mu, logvar

    def reparam(self, mu, logvar):
        std = torch.exp(0.5 * logvar)
        eps = torch.randn_like(std)
        return mu + eps * std

    def decode(self, z, c):
        h = self.fc_dec(torch.cat([z, c], dim=1))
        h = h.view(-1, 256, self.img_size // 8, self.img_size // 8)
        return self.dec(h)

    def forward(self, x, c):
        mu, logvar = self.encode(x, c)
        z = self.reparam(mu, logvar)
        return self.decode(z, c), mu, logvar
