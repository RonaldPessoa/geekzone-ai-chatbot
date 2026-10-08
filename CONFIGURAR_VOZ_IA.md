# Voz IA — GeekZone

1. Crie uma chave na ElevenLabs e escolha dois Voice IDs compatíveis com português brasileiro, com vozes realmente diferentes.
2. No terminal PowerShell do VS Code, ANTES de iniciar o Python, configure as variáveis (não grave chaves no Git):

```powershell
$env:ELEVENLABS_API_KEY = "SUA_CHAVE"
$env:ELEVENLABS_VOICE_NORMAL = "ID_VOZ_NORMAL"
$env:ELEVENLABS_VOICE_SITH = "ID_VOZ_SITH"
python api/cerebro/servidor.py
```

3. Abra o site com Live Server e teste `Darth Vader` e `Jedi`.

A API `/api/voz` gera MP3 via ElevenLabs; em falhas, o JS volta à voz gratuita do navegador. Sem chave e IDs, a opção B NÃO funciona. O serviço pode consumir créditos/cobrar; confira seu plano antes de testar. A voz IA não é filtrada pela Web Audio API. Para implantação pública, configure CORS restrito, autenticação/rate-limit e um proxy HTTPS no mesmo domínio para impedir uso indevido de créditos. Não publique este endpoint aberto na internet.
