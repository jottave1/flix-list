# Flix List

Seu universo de filmes da Netflix, do seu jeito. Um aplicativo pessoal, responsivo e instalável para organizar **Quero assistir** e **Já assisti**.

## Usar

- Busque um filme, filtre por gênero e toque em **+** para salvar.
- Abra um filme para marcar **Já assisti**, avaliar de 1 a 5 estrelas, registrar a data ou escrever uma anotação.
- Use **Escolha por mim** para sortear entre seus filmes para assistir. Se essa lista estiver vazia, sorteia um filme ainda não assistido da seleção filtrada.
- Em **Meu espaço**, exporte e importe backups. Os arquivos são combinados sem substituir alterações mais recentes.
- No celular, abra o endereço publicado e use **Adicionar à tela inicial** no menu do navegador.

Os dados pessoais ficam somente no armazenamento deste navegador. **Não há conta, sincronização automática entre dispositivos nem integração com o histórico da sua conta Netflix.** Para trocar de aparelho, exporte e importe o backup. Limpar os dados do navegador remove suas listas. O aplicativo funciona offline após a primeira abertura; imagens que não foram carregadas podem ficar indisponíveis.

## Catálogo

Títulos e capas são consultados nas [páginas públicas da Netflix Brasil](https://www.netflix.com/br/browse/genre/34399). O parser aceita somente itens identificados como `Movie`, associa capas pelo ID Netflix e combina gêneros sem duplicar filmes. Nenhuma chave de API é necessária.

**É uma seleção, não uma garantia do catálogo completo ou da disponibilidade atual.** As páginas públicas podem omitir filmes. A data da consulta aparece em **Meu espaço**. Sempre confira a disponibilidade pelo botão **Abrir na Netflix**. Filmes que saírem da seleção continuam preservados nas suas listas pessoais.

Para atualizar com Node.js 22 ou superior:

```sh
npm run catalog
```

No Windows, se o Node não conseguir acessar a rede:

```powershell
.\download-catalog.ps1
```

Uma consulta incompleta não substitui o catálogo anterior. As capas continuam hospedadas na Netflix; o projeto não redistribui os arquivos de imagem.

## Executar localmente

Requer Node.js 22 ou superior. Não há dependências para instalar.

```sh
npm start
```

Abra **http://localhost:4173**. O servidor também aceita conexões na rede local. Para acessar pelo celular na mesma rede Wi-Fi, use `http://IP-DO-COMPUTADOR:4173` se o firewall já permitir. Instalação como PWA e modo offline requerem HTTPS ou localhost.

```sh
npm test
npm run build
```

O build cria `dist/`, pronto para hospedagem estática. Os arquivos da raiz também podem ser publicados diretamente pelo GitHub Pages. As URLs relativas permitem hospedagem em um subdiretório como `/flix-list/`.

## Tecnologia

HTML, CSS, JavaScript com módulos, localStorage e Service Worker. Sem dependências de execução e sem credenciais no código. Fontes DM Sans e Manrope via Google Fonts, com fallback para fontes do sistema. Interface em português brasileiro, navegação por teclado, foco visível, suporte a movimento reduzido e diálogos nativos.

Projeto independente, sem afiliação com a Netflix. Títulos, marcas e imagens pertencem aos respectivos titulares.
