import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import ExcelJS from 'exceljs';
import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL não configurada em .env.local');
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL);

function cleanDigits(val) {
  if (!val) return '';
  return String(val).replace(/\D/g, '');
}

function formatCpf(cpf) {
  const digits = cleanDigits(cpf);
  if (digits.length !== 11) return cpf || '';
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '.')
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '');
}

async function importTerceiros() {
  console.log('🔄 Iniciando leitura de TERCEIROS REPARO.xlsx...');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('TERCEIROS REPARO.xlsx');
  
  const p1 = wb.getWorksheet('Planilha1');
  const p2 = wb.getWorksheet('Planilha2');
  
  const peopleMap = new Map();

  // 1. Processar Planilha 1
  p1.eachRow((row, rowNumber) => {
    if (rowNumber >= 3) {
      const v = row.values;
      const rawNome = v[1] ? String(v[1]).trim() : '';
      if (!rawNome || rawNome.toUpperCase() === 'REPARO' || rawNome.toUpperCase() === 'NOME') return;

      const rawEmpresa = v[2] ? String(v[2]).trim() : '';
      const rawCpf = v[3] ? String(v[3]).trim() : '';
      const cpfDigits = cleanDigits(rawCpf);
      const rg = v[4] ? String(v[4]).trim() : '';
      const cnpjOuMatricula = v[5] ? String(v[5]).trim() : '';
      const emailObj = v[7];
      const rawEmail = typeof emailObj === 'object' && emailObj ? emailObj.text || emailObj.result : (emailObj ? String(emailObj).trim() : '');

      const isTke = rawEmpresa.toUpperCase().startsWith('TKE') || rowNumber >= 78;
      let cargo = 'SUBCONTRATADO';
      let depto = 'REPARO';

      if (isTke) {
        if (rawEmpresa.includes('SUPERVISOR') || rawNome.toLowerCase().includes('thiago')) {
          cargo = rawNome.toLowerCase().includes('thiago') ? 'DEV' : 'SUPERVISOR';
        } else if (rawEmpresa.includes('GESTOR') || rawNome.toLowerCase().includes('vagner')) {
          cargo = 'GESTOR';
        } else if (rawEmpresa.includes('ANALISTA') || rawEmpresa.includes('AUXILIAR')) {
          cargo = 'ADMINISTRATIVO';
        } else if (rawEmpresa.includes('TECNICO') || rawEmpresa.includes('TÉCNICO')) {
          cargo = 'TECNICO';
        } else {
          cargo = 'TECNICO';
        }
      }

      const key = cpfDigits ? `CPF:${cpfDigits}` : `NOME:${rawNome.toLowerCase()}`;
      peopleMap.set(key, {
        nome: rawNome,
        empresa: isTke ? (rawEmpresa || 'TKE Elevadores') : rawEmpresa,
        cpfDigits,
        rawCpf,
        rg,
        cnpjOuMatricula,
        rawEmail,
        telefone: '',
        cargo,
        departamento: depto,
        isTke
      });
    }
  });

  // 2. Mesclar Planilha 2
  p2.eachRow((row, rowNumber) => {
    if (rowNumber >= 4) {
      const v = row.values;
      const sobrenome = v[2] ? String(v[2]).trim() : '';
      const nomeP2 = v[3] ? String(v[3]).trim() : '';
      const nomeCompleto = (nomeP2 + ' ' + sobrenome).replace(/\s+/g, ' ').trim();
      if (!nomeCompleto) return;
      const rawCpf = v[12] ? String(v[12]).trim() : '';
      const cpfDigits = cleanDigits(rawCpf);
      const rg = v[11] ? String(v[11]).trim() : '';
      const rawEmpresa = v[10] ? String(v[10]).trim() : '';
      const tel = v[18] ? String(v[18]).trim() : '';
      const emailObj = v[19];
      const rawEmail = typeof emailObj === 'object' && emailObj ? emailObj.text || emailObj.result : (emailObj ? String(emailObj).trim() : '');
      const funcao = v[20] ? String(v[20]).trim() : '';

      const key = cpfDigits ? `CPF:${cpfDigits}` : `NOME:${nomeCompleto.toLowerCase()}`;
      if (peopleMap.has(key)) {
        const item = peopleMap.get(key);
        if (!item.telefone && tel) item.telefone = tel;
        if (!item.rg && rg) item.rg = rg;
        if (!item.empresa && rawEmpresa) item.empresa = rawEmpresa;
        if (!item.rawEmail && rawEmail) item.rawEmail = rawEmail;
        if (funcao) item.funcaoOriginal = funcao;
      } else {
        peopleMap.set(key, {
          nome: nomeCompleto,
          empresa: rawEmpresa,
          cpfDigits,
          rawCpf,
          rg,
          cnpjOuMatricula: '',
          rawEmail,
          telefone: tel,
          cargo: 'SUBCONTRATADO',
          departamento: 'REPARO',
          isTke: false,
          funcaoOriginal: funcao
        });
      }
    }
  });

  console.log(`📋 Total consolidado de pessoas e terceiros: ${peopleMap.size}`);

  // 3. Buscar usuários atuais do banco
  const existingUsers = await sql`SELECT id, nome, email, documento, cargo, senha_hash FROM users`;
  console.log(`🔍 Usuários atualmente no banco: ${existingUsers.length}`);

  const existingByCpf = new Map();
  const existingByEmail = new Map();
  const existingByNome = new Map();

  for (const u of existingUsers) {
    if (u.documento) {
      const c = cleanDigits(u.documento);
      if (c) existingByCpf.set(c, u);
    }
    if (u.email) existingByEmail.set(u.email.toLowerCase().trim(), u);
    if (u.nome) existingByNome.set(u.nome.toLowerCase().trim(), u);
  }

  // Coletar e-mails existentes e frequências
  const usedEmails = new Set(existingUsers.map(u => u.email.toLowerCase().trim()));
  const emailOccurrences = new Map();
  for (const item of peopleMap.values()) {
    if (item.rawEmail && item.rawEmail.includes('@')) {
      const em = item.rawEmail.toLowerCase().trim();
      emailOccurrences.set(em, (emailOccurrences.get(em) || 0) + 1);
    }
  }

  let insertedCount = 0;
  let updatedCount = 0;
  let skippedAdmin = 0;

  for (const item of peopleMap.values()) {
    // Não mexer nas credenciais de Thiago Gregorio (DEV)
    const isThiago = item.nome.toLowerCase().includes('thiago') && (item.nome.toLowerCase().includes('gregorio') || item.isTke);
    if (isThiago) {
      console.log(`👑 Ignorando alteração de credencial do Administrador Thiago Gregorio`);
      skippedAdmin++;
      continue;
    }

    // Calcular senha: 5 primeiros dígitos do CPF
    let senha = '';
    if (item.cpfDigits.length >= 5) {
      senha = item.cpfDigits.substring(0, 5);
    } else if (item.cnpjOuMatricula && cleanDigits(item.cnpjOuMatricula).length >= 5) {
      senha = cleanDigits(item.cnpjOuMatricula).substring(0, 5);
    } else {
      senha = '12345';
    }

    const documentoFormatado = item.cpfDigits ? formatCpf(item.cpfDigits) : (item.cnpjOuMatricula || null);

    // Verificar se usuário já existe
    let matchedUser = null;
    if (item.cpfDigits && existingByCpf.has(item.cpfDigits)) {
      matchedUser = existingByCpf.get(item.cpfDigits);
    } else if (item.rawEmail && existingByEmail.has(item.rawEmail.toLowerCase().trim())) {
      matchedUser = existingByEmail.get(item.rawEmail.toLowerCase().trim());
    } else if (existingByNome.has(item.nome.toLowerCase().trim())) {
      matchedUser = existingByNome.get(item.nome.toLowerCase().trim());
    }

    if (matchedUser) {
      // Atualizar dados cadastrais e senha (caso não seja admin mestre)
      if (matchedUser.cargo === 'DEV' || matchedUser.email === 'thiago.gregorio@tke.com') {
        continue;
      }

      await sql`
        UPDATE users
        SET 
          empresa = COALESCE(${item.empresa || null}, empresa),
          documento = COALESCE(${documentoFormatado}, documento),
          telefone = COALESCE(${item.telefone || null}, telefone),
          senha_hash = ${senha},
          status = 'ATIVO',
          updated_at = NOW()
        WHERE id = ${matchedUser.id}
      `;
      updatedCount++;
      console.log(`✏️ Atualizado: ${item.nome} | CPF: ${documentoFormatado} | Senha: ${senha}`);
    } else {
      // Gerar e-mail único
      let emailFinal = '';
      const cleanRaw = item.rawEmail ? item.rawEmail.toLowerCase().trim() : '';
      if (cleanRaw && cleanRaw.includes('@') && emailOccurrences.get(cleanRaw) === 1 && !usedEmails.has(cleanRaw)) {
        emailFinal = cleanRaw;
      } else {
        const slugNome = slugify(item.nome);
        const slugEmp = slugify(item.empresa || 'terceiro');
        emailFinal = `${slugNome}@${slugEmp}.parceiro.tke.com`;
      }

      // Evitar colisão
      let counter = 1;
      let candidate = emailFinal;
      while (usedEmails.has(candidate)) {
        const parts = emailFinal.split('@');
        candidate = `${parts[0]}${counter}@${parts[1]}`;
        counter++;
      }
      emailFinal = candidate;
      usedEmails.add(emailFinal);

      const podeVerTodas = ['GESTOR', 'SUPERVISOR', 'DEV', 'COORDENADOR', 'GERENTE'].includes(item.cargo);

      await sql`
        INSERT INTO users (
          nome,
          email,
          senha_hash,
          telefone,
          documento,
          empresa,
          departamento,
          cargo,
          status,
          is_admin,
          pode_visualizar_todas_pt_apr,
          created_at,
          updated_at
        ) VALUES (
          ${item.nome},
          ${emailFinal},
          ${senha},
          ${item.telefone || null},
          ${documentoFormatado},
          ${item.empresa || null},
          ${item.departamento},
          ${item.cargo},
          'ATIVO',
          false,
          ${podeVerTodas},
          NOW(),
          NOW()
        )
      `;
      insertedCount++;
      console.log(`✅ Inserido: ${item.nome} (${item.empresa}) | CPF: ${documentoFormatado} | Senha: ${senha} | Email: ${emailFinal}`);
    }
  }

  console.log('\n========================================');
  console.log(`🎉 Processamento concluído com sucesso!`);
  console.log(`Novos cadastros inseridos: ${insertedCount}`);
  console.log(`Cadastros existentes atualizados: ${updatedCount}`);
  console.log(`Administrador preservado: ${skippedAdmin}`);
  console.log('========================================');

  const finalCount = await sql`SELECT count(*)::int as total FROM users`;
  console.log(`📊 Total geral de colaboradores no banco: ${finalCount[0].total}`);

  await sql.end();
}

importTerceiros().catch(err => {
  console.error('❌ Erro na importação:', err);
  process.exit(1);
});
